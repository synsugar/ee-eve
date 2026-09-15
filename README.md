# A self-building agent

An [eve](https://eve.dev) agent that can rewrite itself while it runs.

Ask it to change its instructions, add a tool, or switch models. It writes those files under `agent/` on the host disk, eve reloads, and the next turn is the agent it just became. You can also edit the same tree in the left pane and watch the chat pick up the change.

Built as an internal demo for our Engineers' Exchange.

## How it works

The UI is a Next.js split view: live `agent/` (and `workspace/`) on the left, durable chat on the right.

On localhost, the built-in `write_file`, `read_file`, and `bash` tools are overridden so they hit the host instead of a sandbox. Paths under `agent/` are the running agent source. Everything else lands in `workspace/`. That host-disk hole is disabled in production (`NODE_ENV=production`).

Reset restores `agent/` to the last git commit and clears `workspace/`.

## Getting started

```bash
npm run dev
```

Set `AI_GATEWAY_API_KEY` (or link a Vercel project for `VERCEL_OIDC_TOKEN`).

For the eve terminal REPL instead:

```bash
npm run dev:eve
```
