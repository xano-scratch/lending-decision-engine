import { query, input, s, c, ref, inp, expr, obj } from "@xanots/sdk";
import { lending } from "./group.js";
import { decisions } from "../tables/decisions.js";
import { applications } from "../tables/applications.js";
import { applicants } from "../tables/applicants.js";
import { ruleSets } from "../tables/rule-sets.js";
import { users } from "../tables/users.js";

/**
 * One decision joined to its application, applicant, rule set, and the user who
 * made it. `decision_id` is a path param (a single-row GET lookup belongs in the
 * path). Any signed-in role (viewer and up).
 */
export const decisionDetailQuery = query({
  name: "decisions/detail/{decision_id}",
  verb: "GET",
  apiGroup: lending,
  auth: users,
  input: {
    decision_id: input.int({ required: true }),
  },
  stack: [
    s.db.get({ table: decisions, fieldName: "id", fieldValue: inp("decision_id"), as: "decision" }),
    s.precondition({
      expr: expr(ref("decision", { safe: true }), "!=", c.null()),
      error: c.text("Decision not found."),
      error_type: "notfound",
    }),
    // Guard the application non-null BEFORE drilling applicant_id into a db.get
    // match argument (a null base there is a 400, not a clean skip).
    s.db.get({ table: applications, fieldName: "id", fieldValue: ref("decision.application_id"), as: "application" }),
    s.precondition({
      expr: expr(ref("application", { safe: true }), "!=", c.null()),
      error: c.text("Application not found."),
      error_type: "notfound",
    }),
    s.db.get({ table: applicants, fieldName: "id", fieldValue: ref("application.applicant_id"), as: "applicant" }),
    s.db.get({ table: ruleSets, fieldName: "id", fieldValue: ref("decision.rule_set_id"), as: "rule_set" }),
    s.db.get({ table: users, fieldName: "id", fieldValue: ref("decision.decided_by"), as: "decider" }),
  ],
  response: {
    decision: ref("decision"),
    application: ref("application"),
    applicant: obj({
      id: ref("applicant.id", { safe: true }),
      full_name: ref("applicant.full_name", { safe: true }),
      email: ref("applicant.email", { safe: true }),
      credit_score: ref("applicant.credit_score", { safe: true }),
      employment_status: ref("applicant.employment_status", { safe: true }),
      annual_income: ref("applicant.annual_income", { safe: true }),
      monthly_debt: ref("applicant.monthly_debt", { safe: true }),
    }),
    rule_set: obj({
      id: ref("rule_set.id", { safe: true }),
      version: ref("rule_set.version", { safe: true }),
      name: ref("rule_set.name", { safe: true }),
      status: ref("rule_set.status", { safe: true }),
    }),
    decided_by: obj({
      id: ref("decider.id", { safe: true }),
      name: ref("decider.name", { safe: true }),
      email: ref("decider.email", { safe: true }),
      role: ref("decider.role", { safe: true }),
    }),
  },
});
