// Called from actions/github-script. Untrusted text (issue bodies, PR files) is only parsed as data, never executed.
import { API, MARKER, parseIssue, registration, instructions } from './lib.mjs';

const post = async (path, body) => {
  const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'awesome-web-games-bot' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.error || `Catalog returned ${r.status}`);
  return data;
};

export async function register({ github, context, input }) {
  const { owner, repo } = context.repo, issue_number = context.issue.number;
  try {
    const res = await post('', input);
    await github.rest.issues.createComment({ owner, repo, issue_number, body: instructions(res) });
    await github.rest.issues.addLabels({ owner, repo, issue_number, labels: ['pending-verification'] });
  } catch (e) {
    await github.rest.issues.createComment({ owner, repo, issue_number, body: `Could not register this game: ${e.message.slice(0, 300)}\n\nEdit the submission and open a new one, or register with the MCP tool \`register_app\` at https://appside.build/mcp. Guide: https://appside.build/docs/catalog/` });
  }
}

export async function fromIssue({ github, context }) {
  let input;
  try { input = parseIssue(context.payload.issue.body); }
  catch (e) { const { owner, repo } = context.repo; return github.rest.issues.createComment({ owner, repo, issue_number: context.issue.number, body: `Could not read the form: ${e.message}. Open a new issue with the Add a game form.` }); }
  return register({ github, context, input });
}

export async function fromPullRequest({ github, context }) {
  const { owner, repo } = context.repo, pr = context.payload.pull_request, issue_number = pr.number;
  const files = await github.paginate(github.rest.pulls.listFiles, { owner, repo, pull_number: issue_number, per_page: 100 });
  const subs = files.filter(f => f.status === 'added' && /^submissions\/[a-z0-9.-]+\.json$/.test(f.filename));
  if (!subs.length) {
    if (files.some(f => f.filename === 'README.md')) await github.rest.issues.createComment({ owner, repo, issue_number, body: 'Thanks! The game lists in README.md are generated, so edits there are overwritten. To add a game, add `submissions/<your-domain>.json` (see submissions/README.md), use the Add a game issue form, or call `register_app` at https://appside.build/mcp.' });
    return;
  }
  if (subs.length > 1) return github.rest.issues.createComment({ owner, repo, issue_number, body: 'Please submit one game per pull request.' });
  // Read the file from the PR head as data. The PR's code is never checked out or run.
  const { data } = await github.rest.repos.getContent({ owner: pr.head.repo.owner.login, repo: pr.head.repo.name, path: subs[0].filename, ref: pr.head.sha });
  if (data.size > 4096) return github.rest.issues.createComment({ owner, repo, issue_number, body: 'The submission file must be under 4 KB.' });
  let input;
  try { input = registration(JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'))); }
  catch (e) { return github.rest.issues.createComment({ owner, repo, issue_number, body: `Could not read ${subs[0].filename}: ${e.message}` }); }
  return register({ github, context, input });
}

export async function verify({ github, context }) {
  const { owner, repo } = context.repo, issue_number = context.issue.number, thread = context.payload.issue;
  const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number, per_page: 100 });
  const mine = comments.filter(c => c.user?.login === 'github-actions[bot]').map(c => c.body.match(MARKER)?.[1]).filter(Boolean);
  if (!mine.length) return github.rest.issues.createComment({ owner, repo, issue_number, body: 'No pending registration was found on this thread.' });
  try {
    const app = await post(`/${mine.at(-1)}/verify`, {});
    await github.rest.issues.createComment({ owner, repo, issue_number, body: `Verified. Public page: ${app.url}\n\nThe game appears in this list's README at the next daily update.` });
    await github.rest.issues.addLabels({ owner, repo, issue_number, labels: ['verified'] });
    await github.rest.issues.removeLabel({ owner, repo, issue_number, name: 'pending-verification' }).catch(() => {});
    await github.rest.issues.update({ owner, repo, issue_number, state: 'closed', state_reason: thread.pull_request ? undefined : 'completed' });
  } catch (e) {
    await github.rest.issues.createComment({ owner, repo, issue_number, body: `Not verified yet: ${e.message.slice(0, 300)}. Publish the token, then comment \`/verify\` again.` });
  }
}
