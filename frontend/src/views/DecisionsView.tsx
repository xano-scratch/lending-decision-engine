import { useEffect, useState } from "react";
import { Loader2, ScrollText, Fingerprint } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { api } from "@/lib/api";
import type { DecisionDetail } from "@/lib/api";
import { pct, when, label, money } from "@/lib/format";
import type { ViewProps } from "@/lib/types";
import { OutcomeBadge } from "@/components/status";

export function DecisionsView({ data }: ViewProps) {
  const { decisions, applications, applicants } = data;

  const applicantForApplication = (appId: number) => {
    const app = applications.find((a) => a.id === appId);
    return app ? applicants.find((p) => p.id === app.applicant_id) : undefined;
  };

  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-select the most recent decision so the panel is never empty.
  useEffect(() => {
    if (selected === null && decisions.length > 0) setSelected(decisions[0].id);
  }, [decisions, selected]);

  useEffect(() => {
    if (selected === null) return;
    let live = true;
    setLoading(true);
    api
      .decisionDetail(selected)
      .then((d) => live && setDetail(d))
      .catch(() => live && setDetail(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [selected]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="size-5" />
            Decision audit trail
          </CardTitle>
          <CardDescription>
            Every decision is an immutable row. Re-deciding writes a new one, so the whole history
            stays on the record. Select a row to inspect it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Rule that fired</TableHead>
                <TableHead className="text-right">Policy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    No decisions yet.
                  </TableCell>
                </TableRow>
              )}
              {decisions.map((d) => {
                const who = applicantForApplication(d.application_id);
                return (
                  <TableRow
                    key={d.id}
                    onClick={() => setSelected(d.id)}
                    data-selected={selected === d.id}
                    className="cursor-pointer data-[selected=true]:bg-muted/60"
                  >
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {when(d.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{who?.full_name ?? `#${d.application_id}`}</TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={d.outcome} />
                    </TableCell>
                    <TableCell>{d.fired_rule_name}</TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      v{d.rule_set_version}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="size-5" />
            Decision record
          </CardTitle>
          <CardDescription>The exact rule and policy version that produced this outcome.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="animate-spin size-4" /> Loading…
            </div>
          )}
          {!loading && !detail?.decision && (
            <p className="text-muted-foreground py-8 text-sm">Select a decision to inspect it.</p>
          )}
          {!loading && detail?.decision && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <OutcomeBadge outcome={detail.decision.outcome} />
                <span className="text-muted-foreground text-xs">{when(detail.decision.created_at)}</span>
              </div>

              <div className="bg-muted/50 space-y-1 rounded-lg border p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rule that fired
                </div>
                <div className="font-semibold">{detail.decision.fired_rule_name}</div>
                <p className="text-muted-foreground text-sm">{detail.decision.fired_rule_reason}</p>
              </div>

              <FieldGrid
                rows={[
                  ["Applicant", detail.applicant?.full_name ?? "—"],
                  ["Credit score", String(detail.applicant?.credit_score ?? "—")],
                  ["DTI at decision", pct(detail.decision.dti_ratio)],
                  ["Employment", detail.applicant?.employment_status ? label(detail.applicant.employment_status) : "—"],
                  ["Loan amount", detail.application?.loan_amount != null ? money(detail.application.loan_amount) : "—"],
                  ["Purpose", detail.application?.purpose ? label(detail.application.purpose) : "—"],
                ]}
              />

              <Separator />

              <FieldGrid
                rows={[
                  ["Policy", `${detail.rule_set?.name ?? "—"} (v${detail.rule_set?.version ?? "?"})`],
                  ["Decided by", `${detail.decided_by?.name ?? "—"} (${detail.decided_by?.role ?? "—"})`],
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="space-y-0.5">
          <dt className="text-muted-foreground text-xs">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
