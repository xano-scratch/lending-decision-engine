import { query, s, c, ref, withFilters, fl } from "@xanots/sdk";
import { lending } from "./group.js";
import { users } from "../tables/users.js";
import { applicants } from "../tables/applicants.js";
import { applications } from "../tables/applications.js";
import { ruleSets } from "../tables/rule-sets.js";
import { decisionRules } from "../tables/decision-rules.js";
import { decisions } from "../tables/decisions.js";
import { decideApplication } from "../functions/decide-application.js";

// DTI = monthly_debt * 12 / annual_income — the same formula the submit endpoint
// runs, so the seeded applications carry a genuinely computed ratio.
const dti = (a: string) => withFilters(ref(`${a}.monthly_debt`), fl.mul(12), fl.div(ref(`${a}.annual_income`)));

/**
 * Seed a browsable demo: three role accounts, five applicants, two rule-set
 * versions (a looser v1 active, a stricter v2 draft) with their rules, five
 * applications, and a decision for each under the active v1 policy. Public and
 * idempotent (it truncates first, so re-running resets cleanly).
 *
 * The proof: sign in as admin, activate v2, re-decide, and watch Marco flip from
 * approve to refer and Priya from approve to decline, both preserved in the audit.
 */
export const seedQuery = query({
  name: "seed",
  verb: "POST",
  apiGroup: lending,
  stack: [
    // Reset every table (and its id sequence).
    s.db.truncate({ table: decisions, reset: true }),
    s.db.truncate({ table: applications, reset: true }),
    s.db.truncate({ table: decisionRules, reset: true }),
    s.db.truncate({ table: ruleSets, reset: true }),
    s.db.truncate({ table: applicants, reset: true }),
    s.db.truncate({ table: users, reset: true }),

    // One account per role (passwords are hashed on write by the f.password column).
    s.db.add({ table: users, row: { email: "admin@lender.test", password: "password123", name: "Ada Admin", role: "admin" }, as: "admin" }),
    s.db.add({ table: users, row: { email: "underwriter@lender.test", password: "password123", name: "Uma Underwriter", role: "underwriter" } }),
    s.db.add({ table: users, row: { email: "viewer@lender.test", password: "password123", name: "Vic Viewer", role: "viewer" } }),

    // Applicants chosen to exercise approve / refer / decline under v1.
    s.db.add({ table: applicants, row: { full_name: "Marco Reyes", email: "marco@applicant.test", annual_income: 60000, employment_status: "employed", monthly_debt: 1800, credit_score: 640 }, as: "marco" }),
    s.db.add({ table: applicants, row: { full_name: "Priya Shah", email: "priya@applicant.test", annual_income: 54000, employment_status: "employed", monthly_debt: 1800, credit_score: 580 }, as: "priya" }),
    s.db.add({ table: applicants, row: { full_name: "Dana Ford", email: "dana@applicant.test", annual_income: 90000, employment_status: "employed", monthly_debt: 1500, credit_score: 720 }, as: "dana" }),
    s.db.add({ table: applicants, row: { full_name: "Tom Blake", email: "tom@applicant.test", annual_income: 48000, employment_status: "employed", monthly_debt: 1600, credit_score: 520 }, as: "tom" }),
    s.db.add({ table: applicants, row: { full_name: "Nina Ortiz", email: "nina@applicant.test", annual_income: 72000, employment_status: "self_employed", monthly_debt: 3300, credit_score: 610 }, as: "nina" }),

    // v1 "Baseline" — active, looser. v2 "Tightened" — draft, stricter.
    s.db.add({ table: ruleSets, row: { version: 1, name: "Baseline policy", status: "active", notes: "The looser policy in force today." }, as: "rs1" }),
    s.db.add({ table: ruleSets, row: { version: 2, name: "Tightened policy", status: "draft", notes: "A stricter revision awaiting activation." }, as: "rs2" }),

    // v1 rules (priority order: first match wins).
    s.db.add({ table: decisionRules, row: { rule_set_id: ref("rs1.id"), priority: 10, name: "Credit floor", metric: "credit_score", operator: "lt", threshold: 550, outcome: "decline", reason: "Credit score is below the 550 minimum." } }),
    s.db.add({ table: decisionRules, row: { rule_set_id: ref("rs1.id"), priority: 20, name: "High debt load", metric: "dti_ratio", operator: "gt", threshold: 0.45, outcome: "refer", reason: "Debt to income ratio is above 45 percent." } }),
    s.db.add({ table: decisionRules, row: { rule_set_id: ref("rs1.id"), priority: 30, name: "Strong credit", metric: "credit_score", operator: "gte", threshold: 700, outcome: "approve", reason: "Credit score of 700 or higher clears automatically." } }),
    s.db.add({ table: decisionRules, row: { rule_set_id: ref("rs1.id"), priority: 40, name: "Acceptable debt", metric: "dti_ratio", operator: "lte", threshold: 0.43, outcome: "approve", reason: "Debt to income ratio is within the 43 percent limit." } }),

    // v2 rules (stricter: raises the credit floor and drops the acceptable-debt catch-all).
    s.db.add({ table: decisionRules, row: { rule_set_id: ref("rs2.id"), priority: 10, name: "Credit floor", metric: "credit_score", operator: "lt", threshold: 600, outcome: "decline", reason: "Credit score is below the 600 minimum." } }),
    s.db.add({ table: decisionRules, row: { rule_set_id: ref("rs2.id"), priority: 20, name: "Strong credit", metric: "credit_score", operator: "gte", threshold: 700, outcome: "approve", reason: "Credit score of 700 or higher clears automatically." } }),

    // Applications (DTI computed the same way the submit endpoint does).
    s.db.add({ table: applications, row: { applicant_id: ref("marco.id"), loan_amount: 25000, term_months: 48, purpose: "auto", dti_ratio: dti("marco"), status: "submitted" }, as: "app_marco" }),
    s.db.add({ table: applications, row: { applicant_id: ref("priya.id"), loan_amount: 15000, term_months: 36, purpose: "debt_consolidation", dti_ratio: dti("priya"), status: "submitted" }, as: "app_priya" }),
    s.db.add({ table: applications, row: { applicant_id: ref("dana.id"), loan_amount: 40000, term_months: 60, purpose: "home_improvement", dti_ratio: dti("dana"), status: "submitted" }, as: "app_dana" }),
    s.db.add({ table: applications, row: { applicant_id: ref("tom.id"), loan_amount: 12000, term_months: 24, purpose: "personal", dti_ratio: dti("tom"), status: "submitted" }, as: "app_tom" }),
    s.db.add({ table: applications, row: { applicant_id: ref("nina.id"), loan_amount: 30000, term_months: 48, purpose: "debt_consolidation", dti_ratio: dti("nina"), status: "submitted" }, as: "app_nina" }),

    // Decide each under the active v1 policy so the audit trail is populated.
    s.function.run({ fn: decideApplication, input: { application_id: ref("app_marco.id"), decided_by: ref("admin.id") }, as: "_d1" }),
    s.function.run({ fn: decideApplication, input: { application_id: ref("app_priya.id"), decided_by: ref("admin.id") }, as: "_d2" }),
    s.function.run({ fn: decideApplication, input: { application_id: ref("app_dana.id"), decided_by: ref("admin.id") }, as: "_d3" }),
    s.function.run({ fn: decideApplication, input: { application_id: ref("app_tom.id"), decided_by: ref("admin.id") }, as: "_d4" }),
    s.function.run({ fn: decideApplication, input: { application_id: ref("app_nina.id"), decided_by: ref("admin.id") }, as: "_d5" }),
  ],
  response: {
    status: c.text("seeded"),
    users: c.int(3),
    applicants: c.int(5),
    rule_sets: c.int(2),
    applications: c.int(5),
    decisions: c.int(5),
    active_version: c.int(1),
    note: c.text("Sign in as admin@lender.test, underwriter@lender.test, or viewer@lender.test (password password123)."),
  },
});
