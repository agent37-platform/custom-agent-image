# Custom agent image

The [Agent37 Starter Kit](https://github.com/agent37-platform/starter-kit) — a working
agent app with auth, chat, files and integrations — running on **your own custom Docker image**
 as a template.

<p align="center">
  <img src="screenshots/demo.gif" alt="The dashboard and per-agent workspace" width="100%" />
</p>

Two ways to change what an agent can do, and the example does both:

```
template/Dockerfile              a CLI, baked into the image
skills/whats-installed/SKILL.md  a skill, installed into each new agent
```

**The image is for binaries.** Edit `template/Dockerfile`, run
`npm run release:agent`, and every agent the app creates runs your image. Agent37
builds it — no Docker on your machine, nothing pushed to a registry.

**Skills are runtime.** Hermes reads `~/.hermes/skills`, which lives on the agent's
persistent volume, so an image can't ship them. Drop a folder in `skills/` and the app
writes it into each agent it creates (`src/app/api/agents/route.ts`, one `exec` call).

## Setup

**1. Get two keys** (both behind a login, so only you can fetch them):

- `AGENT37_API_KEY` — Agent37 dashboard → **Cloud → API keys**, then **fund the wallet** (Cloud → Billing).
- `SUPABASE_ACCESS_TOKEN` — [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).

**2. Hand it to your coding agent.** Open this folder in Claude Code / Codex and paste:

```
Set this repo up and run it locally, end to end — follow SETUP.md. Ask me for the two
login-gated keys it needs, then do everything else and tell me the local URL.
```

Or do it yourself:

```bash
npm install
npm run setup     # keys → Supabase → builds and publishes template/
npm run dev       # http://localhost:3000
```

Create an agent, then ask it **"what's installed?"** — the skill answers with the CLI
version and the skills it has.

## Make it yours

1. Edit `template/Dockerfile` (install anything; bake it into `/usr/local`, never `/home`),
   then `npm run release:agent` — new agents get the new image; existing ones update from Settings.
2. Add or replace folders under `skills/` and list them in `SKILLS` (`src/config/agents.ts`).
   No rebuild: the next agent you create gets them.

Details, rules and pitfalls: [AGENTS.md](AGENTS.md) ·
[Build a custom image](https://www.agent37.com/docs/agents-api/custom-image) ·
[SETUP.md](SETUP.md) for deploying.
