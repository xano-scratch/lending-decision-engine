import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/format";

const OUTCOME_STYLE: Record<string, string> = {
  approve: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  refer: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  decline: "border-red-500/30 bg-red-500/10 text-red-300",
};

const OUTCOME_ICON: Record<string, typeof CheckCircle2> = {
  approve: CheckCircle2,
  refer: AlertTriangle,
  decline: XCircle,
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const Icon = OUTCOME_ICON[outcome] ?? AlertTriangle;
  return (
    <Badge variant="outline" className={`gap-1 font-medium ${OUTCOME_STYLE[outcome] ?? ""}`}>
      <Icon className="size-3.5" />
      {label(outcome)}
    </Badge>
  );
}

const SET_STATUS_STYLE: Record<string, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  draft: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  archived: "border-border bg-muted text-muted-foreground",
};

export function RuleSetStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`font-medium ${SET_STATUS_STYLE[status] ?? ""}`}>
      {label(status)}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string | null | undefined }) {
  return (
    <Badge variant="secondary" className="font-medium capitalize">
      {role ?? "unknown"}
    </Badge>
  );
}
