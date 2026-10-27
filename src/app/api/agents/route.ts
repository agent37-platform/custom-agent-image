import { readFile } from "node:fs/promises";
import path from "node:path";
import { agent37 } from "@/lib/agent37";
import { requireAdmin, requireMember, requireUser } from "@/lib/auth";
import { AGENT_TEMPLATES, DEFAULT_AGENT, SKILLS } from "@/config/agents";
import { usdToMicros } from "@/lib/format";
import { ApiError, handleError, json, readJson } from "@/lib/http";
import type { Agent, AgentRow, MergedAgent, Template } from "@/lib/types";

// The image catalog barely changes, but the dashboard polls this route every 5s while any agent is
// transitioning — so cache the template list briefly rather than re-fetching /templates on every
// poll (and on create). Module-scoped + best-effort: a stale entry only delays an agent's
// `update_available` flag by at most the TTL.
let templateCache: { at: number; data: Template[] } | null = null;
const TEMPLATES_TTL_MS = 60_000;

async function getTemplates(): Promise<Template[]> {
  if (templateCache && Date.now() - templateCache.at < TEMPLATES_TTL_MS) return templateCache.data;
  const { data } = await agent37.listTemplates();
  templateCache = { at: Date.now(), data };
  return data;
}

// Give a new agent the skills in skills/. Hermes reads ~/.hermes/skills, which lives on the
// instance's persistent volume, so skills are runtime state — an image can't ship them. Base64
// keeps arbitrary markdown out of shell quoting. Best-effort on purpose: an agent that came up
// is worth more than one that failed creation because a skill didn't land.
async function installSkills(agentId: string) {
  for (const skill of SKILLS) {
    try {
      const body = await readFile(path.join(process.cwd(), "skills", skill, "SKILL.md"), "base64");
      await agent37.exec(
        agentId,
        `mkdir -p ~/.hermes/skills/${skill} && echo ${body} | base64 -d > ~/.hermes/skills/${skill}/SKILL.md`
      );
    } catch (e) {
      console.error(`installing skill ${skill} failed`, agentId, e);
    }
  }
}

async function resolveTemplate(): Promise<string | undefined> {
  try {
    const data = await getTemplates();
    const preferred = data.find((t) => t.name === DEFAULT_AGENT.template);
    if (preferred) return preferred.name;
    const builtin = data.find((t) => t.scope === "system");
    return (builtin ?? data[0])?.name;
  } catch {
    return DEFAULT_AGENT.template;
  }
}

export async function GET(request: Request) {
  try {
    const { db, user } = await requireUser();
    const workspaceId = new URL(request.url).searchParams.get("workspace");
    if (!workspaceId) throw new ApiError(400, "invalid_request", "workspace query param is required");

    const role = await requireMember(db, workspaceId, user.id);

    const { data: rows, error } = await db
      .from("agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, "db_error", error.message);

    let live = new Map<string, Agent>();
    let templateImages = new Map<string, string>();
    const [liveRes, tmplRes] = await Promise.allSettled([
      agent37.listAgents(),
      getTemplates(),
    ]);
    if (liveRes.status === "fulfilled") {
      live = new Map(liveRes.value.data.map((i) => [i.id, i]));
    }
    if (tmplRes.status === "fulfilled") {
      templateImages = new Map(
        tmplRes.value.filter((t) => t.image_ref).map((t) => [t.name, t.image_ref])
      );
    }

    const agents: MergedAgent[] = (rows as AgentRow[]).map((row) => {
      const l = live.get(row.agent37_id);
      if (l && l.status !== row.status) {
        // Best-effort mirror sync. Authorized already: these rows belong to workspaceId, which the
        // caller is a member of (requireMember above).
        db.from("agents").update({ status: l.status }).eq("agent37_id", row.agent37_id).then(() => {});
      }
      const latestImage = l ? templateImages.get(l.template) : undefined;
      return {
        ...row,
        cpu: l?.resources.cpu ?? row.cpu,
        memory: l?.resources.memory ?? row.memory,
        disk: l?.resources.disk ?? row.disk,
        live_status: l?.status ?? row.status,
        status_reason: l?.status_reason ?? null,
        past_due: l?.past_due ?? false,
        ports: l?.ports ?? [],
        update_available: !!(l?.image_ref && latestImage && l.image_ref !== latestImage),
      };
    });

    return json({ agents, role });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser();
    // Shape is fixed server-side (DEFAULT_AGENT); the client picks the workspace and agent type.
    const body = await readJson<{ workspace_id?: string; template?: string }>(request);

    const workspaceId = body.workspace_id;
    if (!workspaceId) throw new ApiError(400, "invalid_request", "workspace_id is required");
    await requireAdmin(db, workspaceId, user.id);

    // Paywall/entitlement seam: a fork can gate agent creation here, e.g.
    // if (!(await canCreateAgent(db, workspaceId))) throw new ApiError(403, "forbidden", "Agent creation is not enabled for this workspace.");

    const template =
      body.template && AGENT_TEMPLATES.includes(body.template)
        ? body.template
        : await resolveTemplate();

    const agent = await agent37.createAgent({
      template,
      resources: {
        cpu: DEFAULT_AGENT.cpu,
        memory: DEFAULT_AGENT.memory,
        disk: DEFAULT_AGENT.disk,
      },
      metadata: { app_workspace: workspaceId },
      budget: { monthly_cap_micros: usdToMicros(DEFAULT_AGENT.monthlyCapUsd) },
    });

    await installSkills(agent.id);

    const { error } = await db.from("agents").insert({
      agent37_id: agent.id,
      workspace_id: workspaceId,
      name: agent.name || null,
      status: agent.status,
      template: agent.template,
      cpu: agent.resources.cpu,
      memory: agent.resources.memory,
      disk: agent.resources.disk,
      created_by: user.id,
    });
    if (error) {
      // Roll back the orphaned agent so we never bill for an untracked box.
      try {
        await agent37.deleteAgent(agent.id);
      } catch {
        /* best-effort */
      }
      throw new ApiError(500, "db_error", error.message);
    }

    return json(agent, 201);
  } catch (e) {
    return handleError(e);
  }
}
