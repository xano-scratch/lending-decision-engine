import { useState } from "react";
import { CheckCheck, Loader2, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { api, ApiError } from "@/lib/api";
import { label, OPERATOR_SYMBOL, METRIC_LABEL, pct } from "@/lib/format";
import type { ViewProps } from "@/lib/types";
import { OutcomeBadge, RuleSetStatusBadge } from "@/components/status";

export function RuleSetsView({ data, role, refresh, notify }: ViewProps) {
  const isAdmin = role === "admin";
  const { ruleSets, rules } = data;
  const [activating, setActivating] = useState<number | null>(null);

  const rulesFor = (setId: number) =>
    rules.filter((r) => r.rule_set_id === setId).sort((a, b) => a.priority - b.priority);

  // A threshold shown for a numeric metric; the DTI metric is a ratio, so show a percent.
  const threshold = (metric: string, value: number | string) =>
    metric === "dti_ratio" ? pct(value) : String(Number(value));

  async function activate(id: number) {
    setActivating(id);
    try {
      await api.activateRuleSet(id);
      notify("Policy version activated. New decisions use it now.", "success");
      await refresh();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not activate the version.", "error");
    } finally {
      setActivating(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4" />
            The proof
          </CardTitle>
          <CardDescription className="text-foreground/80">
            One policy is active at a time. Activate a different version, then re-decide an
            application on the Applications tab. The same application decides differently, and both
            decisions stay on the audit trail. {isAdmin ? "" : "Sign in as admin to activate a version."}
          </CardDescription>
        </CardHeader>
      </Card>

      {ruleSets.map((set) => (
        <Card key={set.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {set.name}
                  <span className="text-muted-foreground text-sm font-normal">v{set.version}</span>
                  <RuleSetStatusBadge status={set.status} />
                </CardTitle>
                {set.notes && <CardDescription>{set.notes}</CardDescription>}
              </div>
              {set.status !== "active" && (
                <Button
                  size="sm"
                  onClick={() => activate(set.id)}
                  disabled={!isAdmin || activating === set.id}
                >
                  {activating === set.id ? <Loader2 className="animate-spin" /> : <CheckCheck />}
                  Activate
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesFor(set.id).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{r.priority}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {METRIC_LABEL[r.metric] ?? label(r.metric)} {OPERATOR_SYMBOL[r.operator] ?? r.operator}{" "}
                      {threshold(r.metric, r.threshold)}
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={r.outcome} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.reason}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="text-muted-foreground tabular-nums">—</TableCell>
                  <TableCell className="font-medium">Default</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">no rule matched</TableCell>
                  <TableCell>
                    <OutcomeBadge outcome="refer" />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">Routed to manual review.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
