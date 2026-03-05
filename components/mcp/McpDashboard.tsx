"use client";

import { useState } from "react";
import {
  Plug, Terminal, Database, Copy, Check, ChevronRight, 
  Wrench, FileText, BookOpen, ExternalLink, Play, Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface McpTool {
  name: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
}

interface McpResource {
  name: string;
  uri: string;
  description: string;
}

interface McpServer {
  name: string;
  version: string;
  status: "active" | "available" | "planned";
  description: string;
  tools: McpTool[];
  resources: McpResource[];
  setupCommand: string;
  configJson: object;
}

// ─── Server Definitions ──────────────────────────────────────────────────────

const MCP_SERVERS: McpServer[] = [
  {
    name: "pontis-kanban",
    version: "1.0.0",
    status: "available",
    description: "Kanban board operations — query, create, update, and move tasks across boards.",
    tools: [
      {
        name: "list_boards",
        description: "List all kanban boards with task counts by status",
        params: [],
      },
      {
        name: "query_tasks",
        description: "Query tasks with filters (board, status, assignee, search, priority)",
        params: [
          { name: "board", type: "string", required: false, description: "Board slug (e.g., 'sprint-3')" },
          { name: "status", type: "enum", required: false, description: "backlog | todo | in_progress | review | done" },
          { name: "assignee", type: "string", required: false, description: "Assignee name filter" },
          { name: "search", type: "string", required: false, description: "Search title/description" },
          { name: "priority", type: "enum", required: false, description: "critical | high | medium | low" },
          { name: "limit", type: "number", required: false, description: "Max results (default 50)" },
        ],
      },
      {
        name: "get_task",
        description: "Get full details of a task by ID",
        params: [
          { name: "task_id", type: "number", required: true, description: "Task ID" },
        ],
      },
      {
        name: "create_task",
        description: "Create a new task on a board",
        params: [
          { name: "title", type: "string", required: true, description: "Task title" },
          { name: "board", type: "string", required: true, description: "Board slug" },
          { name: "description", type: "string", required: false, description: "Task description (markdown)" },
          { name: "status", type: "enum", required: false, description: "Initial status (default: backlog)" },
          { name: "assignee", type: "string", required: false, description: "Assignee name" },
          { name: "priority", type: "enum", required: false, description: "Priority level (default: medium)" },
        ],
      },
      {
        name: "update_task",
        description: "Update any field on an existing task",
        params: [
          { name: "task_id", type: "number", required: true, description: "Task ID to update" },
          { name: "title", type: "string", required: false, description: "New title" },
          { name: "description", type: "string", required: false, description: "New description" },
          { name: "status", type: "enum", required: false, description: "New status" },
          { name: "assignee", type: "string", required: false, description: "New assignee" },
          { name: "priority", type: "enum", required: false, description: "New priority" },
        ],
      },
      {
        name: "move_task",
        description: "Move a task to a different status column",
        params: [
          { name: "task_id", type: "number", required: true, description: "Task ID" },
          { name: "new_status", type: "enum", required: true, description: "Target: backlog | todo | in_progress | review | done" },
        ],
      },
      {
        name: "board_summary",
        description: "Quick board overview: counts by status, priority, assignee + recent tasks",
        params: [
          { name: "board", type: "string", required: true, description: "Board slug" },
        ],
      },
    ],
    resources: [
      {
        name: "kanban-schema",
        uri: "pontis://kanban/schema",
        description: "Database schema for kanban_boards and kanban_tasks tables",
      },
    ],
    setupCommand: `SUPABASE_URL=https://lgvvylbohcboyzahhono.supabase.co \\
SUPABASE_SERVICE_ROLE_KEY=<your-key> \\
npx tsx mcp/pontis-kanban-server.ts`,
    configJson: {
      mcpServers: {
        "pontis-kanban": {
          command: "npx",
          args: ["tsx", "/path/to/mission-control/mcp/pontis-kanban-server.ts"],
          env: {
            SUPABASE_URL: "https://lgvvylbohcboyzahhono.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "<your-service-role-key>",
          },
        },
      },
    },
  },
  {
    name: "pontis-crm",
    version: "1.0.0",
    status: "available",
    description: "CRM operations — query partners, update pipeline status, log interactions, manage fulfillment network.",
    tools: [
      { name: "pipeline_overview", description: "High-level pipeline stats: counts by stage, health, revenue", params: [] },
      {
        name: "search_partners",
        description: "Search partners by name, state, pipeline status, type",
        params: [
          { name: "search", type: "string", required: false, description: "Company name search" },
          { name: "state", type: "string", required: false, description: "State code (e.g., 'UT')" },
          { name: "pipeline_status", type: "enum", required: false, description: "prospect|warm|demo_done|negotiating|active|..." },
          { name: "partner_type", type: "enum", required: false, description: "monument_company|fulfillment_partner|cemetery|other" },
          { name: "limit", type: "number", required: false, description: "Max results (default 50)" },
        ],
      },
      { name: "get_partner", description: "Get full details of a partner by UUID", params: [{ name: "partner_id", type: "string", required: true, description: "Partner UUID" }] },
      {
        name: "create_partner",
        description: "Add a new company to the CRM",
        params: [
          { name: "name", type: "string", required: true, description: "Company name" },
          { name: "city", type: "string", required: false, description: "City" },
          { name: "state", type: "string", required: false, description: "State code" },
          { name: "partner_type", type: "enum", required: false, description: "Type (default: monument_company)" },
          { name: "pipeline_status", type: "enum", required: false, description: "Initial stage (default: prospect)" },
        ],
      },
      {
        name: "update_partner",
        description: "Update any fields on a partner",
        params: [
          { name: "partner_id", type: "string", required: true, description: "Partner UUID" },
          { name: "pipeline_status", type: "enum", required: false, description: "New pipeline stage" },
          { name: "notes", type: "string", required: false, description: "Replace notes" },
          { name: "next_action", type: "string", required: false, description: "Next step" },
          { name: "next_action_assignee", type: "string", required: false, description: "Who owns it" },
        ],
      },
      {
        name: "advance_partner",
        description: "Move partner to next pipeline stage with auto-timestamp + optional note",
        params: [
          { name: "partner_id", type: "string", required: true, description: "Partner UUID" },
          { name: "new_status", type: "enum", required: true, description: "Target pipeline stage" },
          { name: "note", type: "string", required: false, description: "Note about the move" },
        ],
      },
      {
        name: "log_interaction",
        description: "Log a sales interaction (call, email, visit, demo) with auto-timestamp",
        params: [
          { name: "partner_id", type: "string", required: true, description: "Partner UUID" },
          { name: "interaction_type", type: "enum", required: true, description: "call|email|visit|demo|text|meeting" },
          { name: "summary", type: "string", required: true, description: "What happened" },
          { name: "next_action", type: "string", required: false, description: "Next step" },
        ],
      },
      {
        name: "stale_partners",
        description: "Find partners not contacted recently — follow-up reminders",
        params: [
          { name: "days_stale", type: "number", required: false, description: "Days threshold (default 14)" },
          { name: "pipeline_status", type: "enum", required: false, description: "Only check specific stage" },
        ],
      },
      { name: "territory_report", description: "Partner breakdown by state — coverage gaps and concentration", params: [] },
    ],
    resources: [
      { name: "crm-schema", uri: "pontis://crm/schema", description: "Full crm_partners table schema" },
      { name: "pipeline-summary", uri: "pontis://crm/pipeline-summary", description: "Live pipeline summary (non-prospect partners)" },
    ],
    setupCommand: `SUPABASE_URL=https://lgvvylbohcboyzahhono.supabase.co \\
SUPABASE_SERVICE_ROLE_KEY=<your-key> \\
npx tsx mcp/pontis-crm-server.ts`,
    configJson: {
      mcpServers: {
        "pontis-crm": {
          command: "npx",
          args: ["tsx", "/path/to/mission-control/mcp/pontis-crm-server.ts"],
          env: {
            SUPABASE_URL: "https://lgvvylbohcboyzahhono.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "<your-service-role-key>",
          },
        },
      },
    },
  },
  {
    name: "pontis-stripe",
    version: "1.0.0",
    status: "available",
    description: "Stripe analytics — revenue, subscriptions, charges, payouts, MRR calculation. Read-only.",
    tools: [
      { name: "revenue_summary", description: "Total revenue for a time period (today/week/month/quarter/year/all)", params: [{ name: "period", type: "enum", required: false, description: "today|week|month|quarter|year|all (default: quarter)" }] },
      { name: "list_customers", description: "List Stripe customers with email and name", params: [{ name: "limit", type: "number", required: false, description: "Max results (default 20)" }, { name: "email", type: "string", required: false, description: "Filter by email" }] },
      { name: "list_subscriptions", description: "List subscriptions by status", params: [{ name: "status", type: "enum", required: false, description: "active|past_due|canceled|all (default: active)" }] },
      { name: "recent_charges", description: "Most recent charges with details", params: [{ name: "limit", type: "number", required: false, description: "Number of charges (default 10)" }] },
      { name: "get_balance", description: "Current account balance (available + pending)", params: [] },
      { name: "list_products", description: "All products with their prices", params: [{ name: "active", type: "boolean", required: false, description: "Only active products (default true)" }] },
      { name: "list_payouts", description: "Recent bank payouts", params: [{ name: "limit", type: "number", required: false, description: "Number of payouts (default 10)" }] },
      { name: "calculate_mrr", description: "Calculate MRR + ARR from active subscriptions", params: [] },
    ],
    resources: [
      { name: "stripe-overview", uri: "pontis://stripe/overview", description: "Account info, balance, active subs count" },
    ],
    setupCommand: `STRIPE_API_KEY=rk_live_... npx tsx mcp/pontis-stripe-server.ts`,
    configJson: {
      mcpServers: {
        "pontis-stripe": {
          command: "npx",
          args: ["tsx", "/path/to/mission-control/mcp/pontis-stripe-server.ts"],
          env: { STRIPE_API_KEY: "<your-restricted-read-only-key>" },
        },
      },
    },
  },
  {
    name: "supabase (official)",
    version: "hosted",
    status: "available",
    description: "Official Supabase MCP — direct SQL queries, table management, migrations, edge functions, logs, and more. Hosted at mcp.supabase.com.",
    tools: [
      { name: "execute_sql", description: "Execute any SQL query against the database", params: [{ name: "sql", type: "string", required: true, description: "SQL query to execute" }] },
      { name: "list_tables", description: "List all tables in the database", params: [] },
      { name: "list_extensions", description: "List available/installed Postgres extensions", params: [] },
      { name: "list_migrations", description: "List database migrations", params: [] },
      { name: "apply_migration", description: "Apply a database migration", params: [{ name: "sql", type: "string", required: true, description: "Migration SQL" }] },
      { name: "get_logs", description: "Retrieve service logs (API, Postgres, Edge Functions, Auth)", params: [{ name: "service", type: "string", required: true, description: "Service name" }] },
      { name: "get_advisors", description: "Get security and performance advisors", params: [] },
      { name: "generate_typescript_types", description: "Generate TypeScript types from schema", params: [] },
      { name: "list_edge_functions", description: "List all Edge Functions", params: [] },
      { name: "deploy_edge_function", description: "Deploy an Edge Function", params: [{ name: "name", type: "string", required: true, description: "Function name" }] },
      { name: "search_docs", description: "Search Supabase documentation", params: [{ name: "query", type: "string", required: true, description: "Search query" }] },
    ],
    resources: [],
    setupCommand: `# One-click install for Cursor:
# cursor://anysphere.cursor-deeplink/mcp/install?name=supabase&config=eyJ1cmwiOiJodHRwczovL21jcC5zdXBhYmFzZS5jb20vbWNwIn0%3D

# Or add to .cursor/mcp.json or claude_desktop_config.json:`,
    configJson: {
      mcpServers: {
        supabase: {
          url: "https://mcp.supabase.com/mcp",
        },
      },
    },
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    available: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    planned: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium ${colors[status] || colors.planned}`}>
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors text-[#555] hover:text-white"
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

function ToolCard({ tool }: { tool: McpTool }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] transition-colors text-left"
      >
        <Wrench size={14} className="text-[#10b981] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <code className="text-sm text-white font-mono">{tool.name}</code>
          <p className="text-xs text-[#666] mt-0.5 truncate">{tool.description}</p>
        </div>
        <ChevronRight size={14} className={`text-[#555] transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[#2a2a2a]">
          <p className="text-xs text-[#888] mt-3 mb-2">{tool.description}</p>
          {tool.params.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">Parameters</p>
              {tool.params.map((p) => (
                <div key={p.name} className="flex items-start gap-2 text-xs">
                  <code className="text-[#10b981] font-mono bg-[#10b981]/10 px-1.5 py-0.5 rounded flex-shrink-0">
                    {p.name}
                  </code>
                  <span className="text-[#555] flex-shrink-0">({p.type}{p.required ? "" : "?"})</span>
                  <span className="text-[#888]">{p.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#555] italic">No parameters</p>
          )}
        </div>
      )}
    </div>
  );
}

function TestPanel({ server }: { server: McpServer }) {
  const [selectedTool, setSelectedTool] = useState(server.tools[0]?.name || "");
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const endpoints: Record<string, string> = { "pontis-kanban": "/api/mcp/test", "pontis-crm": "/api/mcp/test-crm", "pontis-stripe": "/api/mcp/test-stripe" };
      const endpoint = endpoints[server.name] || "/api/mcp/test";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server: server.name, tool: selectedTool, params }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentTool = server.tools.find((t) => t.name === selectedTool);

  return (
    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Play size={14} className="text-[#10b981]" />
        <h4 className="text-sm font-semibold text-white">Test Tool</h4>
      </div>

      <div className="space-y-3">
        <select
          value={selectedTool}
          onChange={(e) => { setSelectedTool(e.target.value); setParams({}); setResult(null); }}
          className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white outline-none font-mono"
        >
          {server.tools.map((t) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>

        {currentTool?.params.map((p) => (
          <div key={p.name}>
            <label className="text-[10px] text-[#555] uppercase tracking-wider mb-1 block">
              {p.name} {p.required && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              placeholder={p.description}
              value={params[p.name] || ""}
              onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
              className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white outline-none placeholder-[#444] font-mono"
            />
          </div>
        ))}

        <button
          onClick={handleTest}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg text-[#10b981] text-sm hover:bg-[#10b981]/30 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Execute
        </button>

        {result && (
          <div className="relative">
            <div className="absolute right-2 top-2">
              <CopyButton text={result} />
            </div>
            <pre className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-xs text-[#aaa] font-mono overflow-x-auto max-h-80 overflow-y-auto">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ServerCard({ server }: { server: McpServer }) {
  const [expanded, setExpanded] = useState(server.status !== "planned");
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-4 p-5 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center flex-shrink-0">
          <Plug size={18} className="text-[#10b981]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-mono">{server.name}</h3>
            <StatusBadge status={server.status} />
            {server.version !== "0.0.0" && (
              <span className="text-[10px] text-[#555]">v{server.version}</span>
            )}
          </div>
          <p className="text-sm text-[#888] mt-0.5">{server.description}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#555] flex-shrink-0">
          <span className="flex items-center gap-1"><Wrench size={12} />{server.tools.length} tools</span>
          <span className="flex items-center gap-1"><FileText size={12} />{server.resources.length} resources</span>
        </div>
        <ChevronRight size={16} className={`text-[#555] transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      {/* Expanded content */}
      {expanded && server.status !== "planned" && (
        <div className="border-t border-[#2a2a2a] p-5 space-y-5">
          {/* Tools */}
          <div>
            <h4 className="text-xs text-[#555] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wrench size={12} /> Tools ({server.tools.length})
            </h4>
            <div className="space-y-2">
              {server.tools.map((t) => <ToolCard key={t.name} tool={t} />)}
            </div>
          </div>

          {/* Resources */}
          {server.resources.length > 0 && (
            <div>
              <h4 className="text-xs text-[#555] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Database size={12} /> Resources ({server.resources.length})
              </h4>
              <div className="space-y-2">
                {server.resources.map((r) => (
                  <div key={r.uri} className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3 flex items-center gap-3">
                    <FileText size={14} className="text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <code className="text-sm text-white font-mono">{r.name}</code>
                      <p className="text-xs text-[#555] mt-0.5">{r.uri}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Panel */}
          {server.tools.length > 0 && <TestPanel server={server} />}

          {/* Setup */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={12} className="text-[#555]" />
              <h4 className="text-xs text-[#555] uppercase tracking-wider">Setup</h4>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-[#555] uppercase tracking-wider">Run Command</p>
                  <CopyButton text={server.setupCommand} />
                </div>
                <pre className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-xs text-[#aaa] font-mono overflow-x-auto">
                  {server.setupCommand}
                </pre>
              </div>

              <button
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs text-[#10b981] hover:underline flex items-center gap-1"
              >
                {showConfig ? "Hide" : "Show"} Claude Desktop / Cursor config
                <ChevronRight size={12} className={showConfig ? "rotate-90" : ""} />
              </button>

              {showConfig && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider">claude_desktop_config.json</p>
                    <CopyButton text={JSON.stringify(server.configJson, null, 2)} />
                  </div>
                  <pre className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-xs text-[#aaa] font-mono overflow-x-auto">
                    {JSON.stringify(server.configJson, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {expanded && server.status === "planned" && (
        <div className="border-t border-[#2a2a2a] p-5">
          <p className="text-sm text-[#555] italic">Coming soon. This server is in the planning phase.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function McpDashboard() {
  const activeCount = MCP_SERVERS.filter((s) => s.status === "active").length;
  const availableCount = MCP_SERVERS.filter((s) => s.status === "available").length;
  const plannedCount = MCP_SERVERS.filter((s) => s.status === "planned").length;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Plug size={24} className="text-[#10b981]" />
                MCP Servers
              </h1>
              <p className="text-sm text-[#555] mt-1">
                Model Context Protocol servers for AI tool access
              </p>
            </div>
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#444] transition-colors"
            >
              <BookOpen size={14} />
              MCP Docs
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {activeCount} Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {availableCount} Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              {plannedCount} Planned
            </span>
          </div>
        </div>
      </div>

      {/* Server List */}
      <div className="p-6 space-y-4 max-w-5xl">
        {MCP_SERVERS.map((s) => (
          <ServerCard key={s.name} server={s} />
        ))}
      </div>
    </div>
  );
}
