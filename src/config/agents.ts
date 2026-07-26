export interface Shape {
  label: string;
  cpu: number;
  memory: number;
  diskMin: number;
  diskMax: number;
}

export const SHAPE_PRESETS: Shape[] = [
  { label: "Small · 1 vCPU / 3 GB", cpu: 1, memory: 3, diskMin: 6, diskMax: 20 },
  { label: "Standard · 2 vCPU / 4 GB", cpu: 2, memory: 4, diskMin: 6, diskMax: 20 },
  { label: "Pro · 4 vCPU / 8 GB", cpu: 4, memory: 8, diskMin: 20, diskMax: 40 },
  { label: "Max · 8 vCPU / 16 GB", cpu: 8, memory: 16, diskMin: 40, diskMax: 80 },
];

export const DEFAULT_AGENT = {
  // The template published from template/ by `npm run release:agent` — keep this in
  // sync with TEMPLATE_NAME in scripts/release-agent.mjs.
  template: "custom-agent",
  cpu: 2,
  memory: 4,
  disk: 6,
  monthlyCapUsd: 5,
} as const;

export interface AgentTypeOption {
  id: string;
  template: string;
  label: string;
  description: string;
  recommended?: boolean;
}

// The agent types offered on the create screen. One card here: the image built from
// template/. Add more (Agent37's stock `agent37-hermes` / `agent37-openclaw`, or a
// second image of your own) by adding entries.
export const AGENT_TYPES: AgentTypeOption[] = [
  {
    id: "custom",
    template: DEFAULT_AGENT.template,
    label: "Custom Agent",
    description: "Hermes plus the CLI and skill baked in by template/.",
    recommended: true,
  },
];

export const AGENT_TEMPLATES = AGENT_TYPES.map((a) => a.template);

// Skills this app installs into every agent it creates. Hermes loads them from
// ~/.hermes/skills, which lives on the instance's persistent volume — so they are runtime
// state, not image content, and the create route writes them over exec. Each entry is a
// folder under skills/ holding a SKILL.md.
export const SKILLS = ["whats-installed"];

// Labels for the "open in new tab" buttons. Ports come from the live instance
// (instance.ports), never this map — it only prettifies the ports inherited from the
// Hermes base. A port your own image adds falls back to "Port {n}" until you name it here.
export const PORT_LABELS: Record<number, string> = {
  9119: "Dashboard",
  7681: "Terminal",
  8080: "Files",
};
