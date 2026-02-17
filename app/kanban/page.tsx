import { Suspense } from "react";
import KanbanClient from "@/components/kanban/KanbanClient";

export const dynamic = "force-dynamic";

export default function KanbanPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
        <p className="text-[#555] text-sm mt-1">Task management across Pontis boards</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading board...</div>}>
        <KanbanClient />
      </Suspense>
    </div>
  );
}
