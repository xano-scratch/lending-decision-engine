import { useState } from "react";
import { Gavel, Loader2, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { api, ApiError } from "@/lib/api";
import { money, pct, label } from "@/lib/format";
import type { ViewProps } from "@/lib/types";
import { OutcomeBadge } from "@/components/status";
import { PURPOSE, EMPLOYMENT } from "../../../xano/shared/enums.js";

export function ApplicationsView({ data, role, refresh, notify }: ViewProps) {
  const canWrite = role === "admin" || role === "underwriter";
  const { applicants, applications, decisions } = data;

  const applicantName = (id: number) => applicants.find((a) => a.id === id)?.full_name ?? `#${id}`;
  const latestDecision = (appId: number) => decisions.find((d) => d.application_id === appId);

  // ── New application form ──────────────────────────────────────────────────
  const [applicantId, setApplicantId] = useState("");
  const [loanAmount, setLoanAmount] = useState("20000");
  const [termMonths, setTermMonths] = useState("48");
  const [purpose, setPurpose] = useState<string>(PURPOSE[0]);
  const [submitting, setSubmitting] = useState(false);
  const [deciding, setDeciding] = useState<number | null>(null);

  async function submitApplication() {
    if (!applicantId) return notify("Choose an applicant first.", "error");
    setSubmitting(true);
    try {
      await api.createApplication({
        applicant_id: Number(applicantId),
        loan_amount: Number(loanAmount),
        term_months: Number(termMonths),
        purpose: purpose as CreateApplicationPurpose,
      });
      notify("Application submitted.", "success");
      await refresh();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not submit the application.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(appId: number) {
    setDeciding(appId);
    try {
      const r = await api.decide(appId);
      const outcome = (r as { outcome?: string } | null)?.outcome;
      notify(outcome ? `Decision recorded: ${label(outcome)}.` : "Decision recorded.", "success");
      await refresh();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not decide the application.", "error");
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Submit an application</CardTitle>
            <CardDescription>
              Pick an applicant and loan terms. The DTI ratio is computed at submit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Applicant</Label>
              <Select value={applicantId} onValueChange={setApplicantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an applicant" />
                </SelectTrigger>
                <SelectContent>
                  {applicants.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.full_name} · {a.credit_score}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Loan amount</Label>
                <Input id="amount" type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="term">Term (months)</Label>
                <Input id="term" type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSE.map((p) => (
                    <SelectItem key={p} value={p}>
                      {label(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={submitApplication} disabled={!canWrite || submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              Submit application
            </Button>
            {!canWrite && (
              <p className="text-muted-foreground text-xs">
                Read-only. Sign in as an underwriter or admin to submit.
              </p>
            )}
          </CardContent>
        </Card>

        <NewApplicantCard canWrite={canWrite} refresh={refresh} notify={notify} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Decide runs the application through the active policy. Re-decide after activating a
            different version to watch the outcome change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">DTI</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Latest outcome</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    No applications yet.
                  </TableCell>
                </TableRow>
              )}
              {applications.map((app) => {
                const d = latestDecision(app.id);
                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{applicantName(app.applicant_id)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(app.loan_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(app.dti_ratio)}</TableCell>
                    <TableCell>{label(app.purpose)}</TableCell>
                    <TableCell>
                      {d ? (
                        <div className="flex items-center gap-2">
                          <OutcomeBadge outcome={d.outcome} />
                          <span className="text-muted-foreground text-xs">v{d.rule_set_version}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not decided</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={d ? "outline" : "default"}
                        onClick={() => decide(app.id)}
                        disabled={!canWrite || deciding === app.id}
                      >
                        {deciding === app.id ? <Loader2 className="animate-spin" /> : <Gavel />}
                        {d ? "Re-decide" : "Decide"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type CreateApplicationPurpose = (typeof PURPOSE)[number];

function NewApplicantCard({
  canWrite,
  refresh,
  notify,
}: {
  canWrite: boolean;
  refresh: () => Promise<void>;
  notify: ViewProps["notify"];
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [income, setIncome] = useState("60000");
  const [debt, setDebt] = useState("1500");
  const [score, setScore] = useState("680");
  const [employment, setEmployment] = useState<string>(EMPLOYMENT[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!fullName || !email) return notify("Name and email are required.", "error");
    setSaving(true);
    try {
      await api.createApplicant({
        full_name: fullName,
        email,
        annual_income: Number(income),
        monthly_debt: Number(debt),
        credit_score: Number(score),
        employment_status: employment as (typeof EMPLOYMENT)[number],
      });
      notify("Applicant added.", "success");
      setFullName("");
      setEmail("");
      setOpen(false);
      await refresh();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not add the applicant.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4" />
          Add an applicant
        </CardTitle>
        {!open && <CardDescription>Not in the list? Create a new applicant.</CardDescription>}
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inc">Annual income</Label>
              <Input id="inc" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="debt">Monthly debt</Label>
              <Input id="debt" type="number" value={debt} onChange={(e) => setDebt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score">Credit score</Label>
              <Input id="score" type="number" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Employment</Label>
              <Select value={employment} onValueChange={setEmployment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT.map((e) => (
                    <SelectItem key={e} value={e}>
                      {label(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" variant="secondary" onClick={save} disabled={!canWrite || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Save applicant
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
