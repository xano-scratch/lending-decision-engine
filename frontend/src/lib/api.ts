// The one contract: every path, request body, and response shape below is
// DERIVED from the xano query defs (getPath()/verb + InferInput/InferResponse).
// Change a def in xano/ and this file follows — no hand-typed URLs or bodies.

import type { InferInput, InferResponse } from "@xanots/sdk";

// Lean query defs — imported for their getPath()/verb (types erase to nothing).
import { loginQuery } from "../../../xano/api/auth-login.js";
import { seedQuery } from "../../../xano/api/seed.js";
import { createApplicantQuery } from "../../../xano/api/applicants-create.js";
import { listApplicantsQuery } from "../../../xano/api/applicants-list.js";
import { createApplicationQuery } from "../../../xano/api/applications-create.js";
import { listApplicationsQuery } from "../../../xano/api/applications-list.js";
import { decideApplicationQuery } from "../../../xano/api/applications-decide.js";
import { listDecisionsQuery } from "../../../xano/api/decisions-list.js";
import { decisionDetailQuery } from "../../../xano/api/decisions-detail.js";
import { listRuleSetsQuery } from "../../../xano/api/rule-sets-list.js";
import { listRulesQuery } from "../../../xano/api/rules-list.js";
import { activateRuleSetQuery } from "../../../xano/api/rule-sets-activate.js";
import { upsertRuleQuery } from "../../../xano/api/rules-upsert.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy --static`, or read from `VITE_XANO_HOST` in local dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Auth token (persisted) ──────────────────────────────────────────────────
const TOKEN_KEY = "lde_token";
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, verb: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const j = JSON.parse(text);
      message = j.message || j.error || text;
    } catch {
      /* keep raw text */
    }
    throw new ApiError(res.status, message || `Request failed (${res.status})`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

// ── Types derived from the defs ───────────────────────────────────────────────
export type LoginBody = InferInput<typeof loginQuery>;
export type LoginResult = InferResponse<typeof loginQuery>;
export type User = LoginResult["user"];
export type Role = User["role"];

export type Applicant = InferResponse<typeof listApplicantsQuery>[number];
export type CreateApplicantBody = InferInput<typeof createApplicantQuery>;
export type Application = InferResponse<typeof listApplicationsQuery>[number];
export type CreateApplicationBody = InferInput<typeof createApplicationQuery>;
export type Decision = InferResponse<typeof listDecisionsQuery>[number];
export type DecisionDetail = InferResponse<typeof decisionDetailQuery>;
export type RuleSet = InferResponse<typeof listRuleSetsQuery>[number];
export type Rule = InferResponse<typeof listRulesQuery>[number];
export type UpsertRuleBody = InferInput<typeof upsertRuleQuery>;

// ── Endpoint wrappers ─────────────────────────────────────────────────────────
export const api = {
  login: (body: LoginBody) => call<LoginResult>(loginQuery.getPath(), loginQuery.verb, body),
  seed: () => call<InferResponse<typeof seedQuery>>(seedQuery.getPath(), seedQuery.verb, {}),

  listApplicants: () => call<Applicant[]>(listApplicantsQuery.getPath(), listApplicantsQuery.verb),
  createApplicant: (body: CreateApplicantBody) =>
    call<Applicant>(createApplicantQuery.getPath(), createApplicantQuery.verb, body),

  listApplications: () => call<Application[]>(listApplicationsQuery.getPath(), listApplicationsQuery.verb),
  createApplication: (body: CreateApplicationBody) =>
    call<Application>(createApplicationQuery.getPath(), createApplicationQuery.verb, body),
  decide: (application_id: number) =>
    call<InferResponse<typeof decideApplicationQuery>>(
      decideApplicationQuery.getPath(),
      decideApplicationQuery.verb,
      { application_id },
    ),

  listDecisions: () => call<Decision[]>(listDecisionsQuery.getPath(), listDecisionsQuery.verb),
  decisionDetail: (decision_id: number) =>
    call<DecisionDetail>(
      decisionDetailQuery.getPath({ params: { decision_id: String(decision_id) } }),
      decisionDetailQuery.verb,
    ),

  listRuleSets: () => call<RuleSet[]>(listRuleSetsQuery.getPath(), listRuleSetsQuery.verb),
  listRules: () => call<Rule[]>(listRulesQuery.getPath(), listRulesQuery.verb),
  activateRuleSet: (rule_set_id: number) =>
    call<RuleSet>(activateRuleSetQuery.getPath(), activateRuleSetQuery.verb, { rule_set_id }),
  upsertRule: (body: UpsertRuleBody) =>
    call<{ ok: boolean; rule_set_id: number }>(upsertRuleQuery.getPath(), upsertRuleQuery.verb, body),
};
