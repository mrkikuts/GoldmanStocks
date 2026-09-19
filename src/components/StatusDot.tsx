import { statusLabel } from "@/lib/labels";
import type { PlantStatus } from "@/lib/types";

const dotClass: Record<PlantStatus, string> = {
  healthy: "bg-status-healthy",
  attention: "bg-status-attention",
  critical: "bg-status-critical",
};

export function StatusDot({ status }: { status: PlantStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`size-2.5 rounded-full ${dotClass[status]}`} />
      {statusLabel[status]}
    </span>
  );
}
