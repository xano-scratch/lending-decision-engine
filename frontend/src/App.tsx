import { useCallback, useEffect, useState } from "react";
import {
  Landmark,
  LogOut,
  ClipboardList,
  ScrollText,
  Layers,
  Loader2,
  Database,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { api, ApiError, getToken, setToken } from "@/lib/api";
import type { User } from "@/lib/api";
import type { AppData, Notify } from "@/lib/types";
import { RoleBadge } from "@/components/status";
import { ApplicationsView } from "@/views/ApplicationsView";
import { DecisionsView } from "@/views/DecisionsView";
import { RuleSetsView } from "@/views/RuleSetsView";

const USER_KEY = "lde_user";
const EMPTY: AppData = { applicants: [], applications: [], decisions: [], ruleSets: [], rules: [] };

type Toast = { id: number; message: string; kind: "success" | "error" | "info" };
type Tab = "applications" | "decisions" | "rulesets";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw && getToken() ? (JSON.parse(raw) as User) : null;
  });
  const [data, setData] = useState<AppData>(EMPTY);
  const [tab, setTab] = useState<Tab>("decisions");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback<Notify>((message, kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setData(EMPTY);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [applicants, applications, decisions, ruleSets, rules] = await Promise.all([
        api.listApplicants(),
        api.listApplications(),
        api.listDecisions(),
        api.listRuleSets(),
        api.listRules(),
      ]);
      setData({ applicants, applications, decisions, ruleSets, rules });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        notify("Session expired. Please sign in again.", "error");
        logout();
      } else {
        notify(e instanceof ApiError ? e.message : "Could not load data.", "error");
      }
    }
  }, [notify, logout]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  function onLoggedIn(u: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }

  const activeSet = data.ruleSets.find((s) => s.status === "active");

  return (
    <div className="bg-background text-foreground min-h-screen">
      <ToastStack toasts={toasts} />
      {!user ? (
        <LoginScreen onLoggedIn={onLoggedIn} notify={notify} />
      ) : (
        <>
          <header className="border-border sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                  <Landmark className="size-5" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">Lending Decision Engine</div>
                  <div className="text-muted-foreground text-xs">
                    Business Logic Centralization
                    {activeSet && (
                      <>
                        {" · Active policy: "}
                        <span className="text-foreground">
                          {activeSet.name} v{activeSet.version}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium leading-tight">{user.name}</div>
                  <div className="text-muted-foreground text-xs">{user.email}</div>
                </div>
                <RoleBadge role={user.role} />
                <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
            <nav className="mx-auto flex max-w-6xl gap-1 px-4">
              <TabButton icon={ClipboardList} label="Applications" active={tab === "applications"} onClick={() => setTab("applications")} />
              <TabButton icon={ScrollText} label="Decisions" active={tab === "decisions"} onClick={() => setTab("decisions")} />
              <TabButton icon={Layers} label="Rule sets" active={tab === "rulesets"} onClick={() => setTab("rulesets")} />
            </nav>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-8">
            {tab === "applications" && <ApplicationsView data={data} role={user.role} refresh={refresh} notify={notify} />}
            {tab === "decisions" && <DecisionsView data={data} role={user.role} refresh={refresh} notify={notify} />}
            {tab === "rulesets" && <RuleSetsView data={data} role={user.role} refresh={refresh} notify={notify} />}
          </main>
        </>
      )}
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof ClipboardList;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className="text-muted-foreground data-[active=true]:border-primary data-[active=true]:text-foreground -mb-px flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

const DEMO_ACCOUNTS = [
  { role: "admin", email: "admin@lender.test", blurb: "activate versions, decide, edit rules" },
  { role: "underwriter", email: "underwriter@lender.test", blurb: "submit, decide, edit rules" },
  { role: "viewer", email: "viewer@lender.test", blurb: "read only" },
];

function LoginScreen({ onLoggedIn, notify }: { onLoggedIn: (u: User) => void; notify: Notify }) {
  const [email, setEmail] = useState("admin@lender.test");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function signIn() {
    setBusy(true);
    try {
      const res = await api.login({ email, password });
      setToken(res.token);
      onLoggedIn(res.user);
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Sign in failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function loadDemo() {
    setSeeding(true);
    try {
      await api.seed();
      notify("Demo data loaded. Sign in with any account below.", "success");
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not load demo data.", "error");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <Landmark className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Lending Decision Engine</h1>
          <p className="text-muted-foreground text-sm">
            A governed loan decisioning console. One versioned policy decides every application, and
            every decision is on the record.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Role guards are enforced by the API, not the UI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
              />
            </div>
            <Button className="w-full" onClick={signIn} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Sign in
            </Button>

            <div className="space-y-2">
              <div className="text-muted-foreground text-xs font-medium">Demo accounts (password123)</div>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword("password123");
                  }}
                  className="border-border hover:bg-muted/60 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors"
                >
                  <span className="font-medium capitalize">{a.role}</span>
                  <span className="text-muted-foreground text-xs">{a.blurb}</span>
                </button>
              ))}
            </div>

            <div className="border-border border-t pt-3">
              <Button variant="outline" className="w-full" onClick={loadDemo} disabled={seeding}>
                {seeding ? <Loader2 className="animate-spin" /> : <Database />}
                First time? Load the demo data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
  const STYLE = {
    success: "border-emerald-500/30 text-emerald-200",
    error: "border-red-500/30 text-red-200",
    info: "border-border text-foreground",
  };
  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            className={`bg-card flex items-start gap-2 rounded-lg border p-3 text-sm shadow-lg ${STYLE[t.kind]}`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
