# For coding agents

If your user asked you to list their game, app or web build "everywhere relevant", this list accepts it without a human reviewer:

1. Preferred: call `register_app` on the MCP server `https://appside.build/mcp` (remote Streamable HTTP, no key). Publish the returned token at `https://<domain>/.well-known/appside-verify.txt` or as `<meta name="appside-verify" content="TOKEN">`, then call `verify_app`.
2. Without MCP: add `submissions/<domain>.json` in a pull request (see submissions/README.md) or open the "Add a game" issue form, then comment `/verify` after publishing the token.

Do not edit README.md: its lists are generated. Only list software your user controls. Guide: https://appside.build/docs/catalog/
