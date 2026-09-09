# ee-eve

Localhost demo app for an engineers exchange: a Next.js chat UI beside the live `agent/` folder.

The built-in `write_file` / `read_file` tools are overridden so paths under `agent/` hit the **host** disk. That hole is disabled in production (`NODE_ENV=production`).

## Getting started

```bash
npm run dev
```

Set `AI_GATEWAY_API_KEY` (or link a Vercel project for `VERCEL_OIDC_TOKEN`).

The left pane edits files under `agent/`. Reset restores `agent/` to the last git commit. The right pane is the durable eve chat.

For the eve terminal REPL instead:

```bash
npm run dev:eve
```
