# AGENTS.md

Guidance for AI coding agents (and humans) working in **custom-agent-image**.
`CLAUDE.md` imports this file via `@AGENTS.md`, so this is the single source of
truth — edit here, not there.

This repo is the [Agent37 Starter Kit](https://github.com/agent37-platform/starter-kit)
with one thing changed: its agents run an image built from `template/` instead of a
stock one. Everything below the `## The custom image` section is starter-kit
behaviour, unchanged — if you touch app code, keep the diff against the starter kit
small so fixes can flow both ways.

## First-time setup

Setting this up from a fresh clone? Follow **[`SETUP.md`](SETUP.md)** — the complete runbook
(it's what the README tells adopters to hand you). Two login-gated secrets are human-supplied:
`AGENT37_API_KEY` (plus a **funded** Agent37 wallet) and `SUPABASE_ACCESS_TOKEN`;
`npm run setup` does the rest. Never print or commit the `sk_live_` key.

## What this project is

A full-stack starter for building your own agent app, built entirely on top of the
public **[Agent37](https://www.agent37.com) B2B Agents API**: email + password auth
(open signup, no verification), a multi-agent fleet, and — for each agent — native
in-dashboard **Chat**, a **Files** browser, **Integrations** (Composio), and a
**Settings** tab. Forkers rebrand it (`src/config/branding.ts`) and ship it; their
end users sign up, get workspaces, invite teammates, and create / manage agents.

Every agent it creates runs the image in `template/` — a workspace template this repo
builds and publishes itself, rather than one of Agent37's stock images. That is the
one difference from the starter kit; see `## The custom image`.

Everything this app can do is a **subset of the Agent37 `/v1` API** — control plane
*and* data plane. This repo is a *client* of that API — it does not implement agent
infrastructure itself. So **the API docs, not this code, are the authority on what an
agent can and cannot do.**

## The API this is built on — read the docs first

This product is built on top of our public API. **Before adding or changing any
agent capability, consult the docs** — they define the full surface and its
limits. Two machine-readable entry points are designed for you (an AI agent) to
fetch directly:

- **<https://www.agent37.com/docs/llms.txt>** — concise index of every doc page.
  *Start here* to find the right page.
- **<https://www.agent37.com/docs/llms-full.txt>** — the entire documentation
  inlined into one file. Use for deep reference.
- Human-browsable docs: **<https://www.agent37.com/docs>**
  (append `.md` to any page URL to get raw markdown.)

### Documented capability map

Two planes, one `sk_live_` key — and this template now drives **both**. The
**control plane** manages instances (and the per-agent Composio integrations); the
**data plane** powers the native Chat and Files tabs.

**Control plane — `https://api.agent37.com/v1/*`** (the `sk_live_` key this app holds):

| Page | Covers | Used here |
|---|---|---|
| [Core concepts](https://www.agent37.com/docs/agents-api/concepts) | the model, auth, the two planes | read first |
| [Instances](https://www.agent37.com/docs/agents-api/instances) | create / list / get / start / stop / restart / update / resize / delete | ✅ |
| [Instance URLs](https://www.agent37.com/docs/agents-api/urls) | short-lived signed URLs to open an agent's ports | ✅ |
| [Templates](https://www.agent37.com/docs/agents-api/templates) | the agent images you can provision | ✅ |
| [Managed services & budgets](https://www.agent37.com/docs/agents-api/budgets) | per-agent managed-spend cap | ✅ |
| [Billing](https://www.agent37.com/docs/agents-api/billing) | wallet, compute prepay, usage | ✅ (usage) |
| [Run commands](https://www.agent37.com/docs/agents-api/exec) | exec a command inside an instance | ✅ (skills) |
| [Errors](https://www.agent37.com/docs/agents-api/errors) | machine-readable error codes | ✅ (mapped in `Agent37Error`) |

Exec is the one row not called on `api.agent37.com`: this app sends it to
`https://sandbox.agent37.app/v1/instances/{id}/exec` with the `X-Agent37-Key` header, which the
machine the instance runs on answers directly. The `api.agent37.com` form still works, a hop slower.

The **Integrations** tab is also control plane: it manages a per-agent Composio
entity through `/instances/{id}/integrations/*` (toolkits / connect / connections).

**Data plane — `https://{instanceId}.agent37.app/v1/*`** (talk to one agent's
gateway). Data-plane requests authenticate with the `X-Agent37-Key: sk_live_...`
header (raw key, no Bearer prefix; `Authorization` passes through to the app inside
the instance), while the control plane stays `Authorization: Bearer`. The native
**Chat** and **Files** tabs call these endpoints directly
(through this app's BFF). The signed-URL "open in new tab" shortcuts still exist
too — they just complement the in-dashboard UIs now rather than replace them:

| Page | Covers | Used here |
|---|---|---|
| [Send a message](https://www.agent37.com/docs/agents-api/chat) | post a message, get a response (`/v1/responses`) | ✅ (Chat) |
| [Streaming](https://www.agent37.com/docs/agents-api/streaming) | stream responses (SSE) | ✅ (Chat) |
| [Sessions & models](https://www.agent37.com/docs/agents-api/sessions) | conversation state, model selection | ✅ (Chat) |
| [Files](https://www.agent37.com/docs/agents-api/files) | list / read / write / archive files | ✅ (Files) |
| [Build a chat app](https://www.agent37.com/docs/agents-api/chat-app) | end-to-end guide for a chat UI | reference |

So: **what's possible** = the whole map above, and this template now exercises most
of it: the control-plane rows marked ✅, the native data-plane Chat and Files tabs,
the per-agent Integrations tab, *and* the signed-URL buttons that open each agent's
own dashboard / terminal / files UI in a new tab.

## How this app fits together

```
Browser ─▶ Next.js (this app) ─▶ control plane  https://api.agent37.com/v1   (instances, integrations)
   │            │              └▶ sandbox        https://sandbox.agent37.app/v1      (exec)
   │            │              └▶ data plane     https://{instance}.agent37.app/v1   (chat, files)
   │            │                                 (one server-side sk_live_ key everywhere:
   │            │                                  Bearer on the control plane, X-Agent37-Key on agent37.app)
   │            │
   │            └─▶ Supabase: Auth (browser, anon key) + Postgres (server-only, service-role key):
   │                          users, workspaces, members, agent mirror
   │
   └──────────────▶ https://{instance}.agent37.app  (agent's own UI, via short-lived signed URLs)
```

- **One key, many app workspaces.** A single `sk_live_` key, server-side only, is
  shared by the whole app. Every agent is created under your one Agent37 workspace
  and tagged `metadata.app_workspace`; a Supabase mirror table is the source of
  truth for which app-workspace owns which agent.
- **Isolation is enforced in the server (BFF), not in the browser.** Clients have **no**
  direct table access — the schema migration (`0001_init.sql`) grants tables only to the
  service role, so the browser only uses Supabase for *auth*. Every read and write
  goes through `src/app/api/**` using the **service-role** client (`src/lib/supabase/admin.ts`,
  which bypasses RLS); the TypeScript checks in `src/lib/auth.ts` (`requireUser` /
  `requireMember` / `requireAdmin` / `requireAgentAccess`) are the authorization boundary. RLS
  policies stay enabled as a backstop but are dormant (clients can't reach the tables). Neither
  the `sk_live_` key nor the service-role key ever reaches the browser.
- **`src/lib/agent37.ts` is the only thing that calls the Agent37 API**
  (`server-only`) — both the control-plane base and each instance's data-plane host.
  Internal `src/app/api/**` routes are this app's BFF: the browser calls them, they
  authenticate + check workspace ownership in TS, then call `agent37.ts` and/or the DB via the
  service-role client. The browser never calls the upstream API or the DB directly.
- **The UI is a fleet + a per-agent workspace.** The `(fleet)` route group is the
  multi-agent dashboard (agents, members, invitations, workspace settings). Clicking
  an agent opens `/dashboard/agents/{agentId}/{tab}` — a tabbed workspace (Chat /
  Files / Integrations / Settings) where the active agent is bound to the URL and
  switchable from a dropdown. Creating an agent is one screen: pick a type from the
  curated catalog (`AGENT_TYPES`) and an optional name; shape and budget are fixed
  server-side (`DEFAULT_AGENT`).
- **Naming:** the upstream API calls these resources **instances**; this app brands
  them **agents**. Paths stay `/instances`; the client methods read `agent…`.

## Where things live

| Path | What |
|---|---|
| `src/lib/agent37.ts` | The Agent37 `/v1` client — the single egress to both planes |
| `src/app/api/**` | This app's own API routes (BFF); enforce auth + ownership |
| `src/app/api/agents/[id]/{chat,files}/**` | Data-plane BFF: native Chat + Files proxied to the instance |
| `src/app/api/agents/[id]/integrations/**` | Composio integrations BFF (control plane) |
| `src/app/dashboard/agents/[agentId]/[[...tab]]/` | The per-agent tabbed workspace route (Chat / Files / Integrations / Settings) |
| `src/config/agents.ts` | `SHAPE_PRESETS`, `DEFAULT_AGENT`, the `AGENT_TYPES` catalog, and `PORT_LABELS` (labels only — ports come from the live instance) |
| `src/config/branding.ts` | `appName` / `logoUrl` code constants (branding lives here, not in env) |
| `src/lib/types.ts` | App + upstream `/v1` types |
| `supabase/migrations/0001_init.sql` | Schema, RLS policies (dormant backstop), SECURITY DEFINER RPCs; grants tables to the service role only (clients have no direct DB access) |
| `src/lib/supabase/admin.ts` | Service-role client (server-only, bypasses RLS) — the DB egress |
| `scripts/setup.mjs` | One-command setup (`npm run setup`): Supabase, then publishes the template |
| `template/` | The image: just a `Dockerfile`. This folder *is* the build context |
| `skills/` | Skills the app installs into every new agent (`SKILLS` in `src/config/agents.ts`) |
| `scripts/release-agent.mjs` | Builds + publishes `template/` (`npm run release:agent`) |

## Commands

```bash
npm install
npm run setup         # Supabase end-to-end + publish the template (idempotent)
npm run release:agent # rebuild + publish template/ after editing it
npm run dev           # http://localhost:3000
npm run build
npm run typecheck     # tsc --noEmit
```

There is no test suite; the gate before shipping is a clean `npm run typecheck`
and `npm run build`. Setup is "paste two keys + `npm run setup`" — no manual
dashboard steps.

## The custom image

`template/` is the build context and nothing else: a `Dockerfile` on the full Hermes
image. `npm run release:agent`
(`scripts/release-agent.mjs`) uploads that folder to Agent37, which builds it on its
own `linux/amd64` builders and publishes it as the workspace template `custom-agent`.
No local Docker, no registry. `npm run setup` runs the same publish once, so a fresh
clone works end to end; the app's only `AGENT_TYPES` entry points at that template.

The reference is [Build a custom image](https://www.agent37.com/docs/agents-api/custom-image);
the contract is [Templates](https://www.agent37.com/docs/agents-api/templates#build-on-the-hermes-base-image).
What actually bites:

- **`/home` is masked.** `/home/node` and `/home/linuxbrew` are persistent volumes
  mounted over the image at runtime, so anything baked there disappears. Binaries →
  `/usr/local/bin` (hence `NPM_CONFIG_PREFIX=/usr/local` for npm globals), everything
  else → `/opt`.
- **Skills can't ship in the image.** Hermes reads `~/.hermes/skills`, which is on the
  agent's persistent volume, so anything the image puts there is masked. (The platform
  used to copy a baked `default-skills` dir in at boot; that mechanism was removed in
  July 2026 because a permissions failure crash-looped containers.) This app keeps its
  skills in `skills/` and writes them over `exec` when it creates an agent — see
  `installSkills` in `src/app/api/agents/route.ts`. Existing agents keep what they have.
- **Keep the base `ENTRYPOINT`.** It starts Hermes and the gateway that serves chat —
  override it and the Chat and Files tabs go dead.
- **The cloud build takes no build args.** `agent37 templates build` has `--name` and
  `--default-port` only, so `ARG HERMES_TAG` uses its `latest` default there. Pin the
  tag in the `FROM` line if you need reproducible rebuilds.
- **`.dockerignore` negations are ignored** by the build CLI (plain patterns become
  `tar --exclude`). A `*` + `!keep-me` pair would exclude the `Dockerfile` itself and
  the build would have nothing to build. `template/` has no `.dockerignore` on purpose.
- **The image is capped at 8 GB** and must be `linux/amd64` (cloud builds are).
- **Revisions are immutable.** Re-publishing bumps the template revision; existing
  agents keep the revision they were created with until they are updated
  (`POST /v1/instances/{id}/update`, the Settings tab's update action).
- **Ports:** the image inherits Hermes's (gateway 3737, terminal 7681, files 8080,
  dashboard 9119). A port your own image adds is reachable at
  `{instanceId}-{port}.agent37.app`; name it in `PORT_LABELS` to give it a button.

The baked CLI (`claude`) ships **unauthenticated** on purpose: a key baked into the
image would sit in a layer and in every agent's env, readable from the terminal any
user can open. Users sign in themselves from the Terminal tab.

## House rules

- **The API is the final authority.** Shapes, disks, templates, budgets — the
  `/v1` API can reject anything your account's tier disallows, regardless of what
  `src/config` lists. Check the docs before assuming a capability exists.
- **Never expose `AGENT37_API_KEY` to the browser.** It stays server-side; all
  agent calls go through `src/app/api/**` → `src/lib/agent37.ts`.
- **Payments are intentionally excluded.** Add Stripe (or anything) yourself when
  you're ready to charge your own customers — the create route (`src/app/api/agents/route.ts`)
  has a commented `canCreateAgent()` seam marking where an entitlement gate would go.
- **Branding lives in `src/config/branding.ts`** (`appName` / `logoUrl` constants),
  not in env. The old `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_LOGO_URL` vars are gone;
  keep it code-side.
- Keep changes small and focused; don't add unrequested features or touch
  unrelated code.
