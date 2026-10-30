# Submissions

Add one file per game, named after its domain, for example `submissions/mygame.example.json`. Open a pull request. A bot registers the game and replies with an ownership token; publish it on your site and comment `/verify`. The pull request is closed once the game is verified, and the game appears in the README at the next daily update.

```json
{
  "name": "Star Hop",
  "url": "https://starhop.example",
  "description": "A tiny platformer about hopping between stars, playable in the browser.",
  "platforms": ["web", "android"],
  "webBuildUrl": "https://starhop.example/play/",
  "playStoreUrl": "https://play.google.com/store/apps/details?id=example.starhop"
}
```

Fields: `name` (1-60 characters), `description` (25-300 characters, plain text), `platforms` (any of web, ios, android, windows, macos, linux), and a `url` on a domain you control or an `appStoreUrl` / `playStoreUrl`. `webBuildUrl` is optional, on the same domain or itch.io. Do not include an email address: pull requests are public.
