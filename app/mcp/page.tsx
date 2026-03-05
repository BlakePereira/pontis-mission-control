import McpDashboard from "@/components/mcp/McpDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MCP Servers — Mission Control",
  description: "Model Context Protocol server management and testing",
};

export default function McpPage() {
  return <McpDashboard />;
}
