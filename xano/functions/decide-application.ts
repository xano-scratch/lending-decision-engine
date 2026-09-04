import { defineFunction, input, s, c, ref, inp, col, expr } from "@xanots/sdk";
import { applications } from "../tables/applications.js";
import { applicants } from "../tables/applicants.js";
import { ruleSets } from "../tables/rule-sets.js";
import { decisionRules } from "../tables/decision-rules.js";
import { decisions } from "../tables/decisions.js";

/**
 * THE ONE GOVERNED JOB. Every credit decision runs through this single function,
 * called by both the /applications/decide endpoint and the seed. It:
 *   1. loads the application, its applicant, and the ONE active rule set;
 *   2. walks that set's rules by priority and fires the FIRST whose condition holds;
 *   3. writes an immutable audit row snapshotting the outcome, the firing rule,
 *      the rule-set version, and the DTI;
 *   4. flips the application to `decided`.
 *
 * Bump the active rule set to a new version and the same application decides
 * differently, on the record. That is the whole proof.
 *
 * `employment_status` is compared as a risk-ordered integer (employed 1 <
 * self_employed 2 < unemployed 3) so one numeric comparison path serves every
 * metric. A rule like `employment_status gte 3` therefore reads "unemployed".
 */
export const decideApplication = defineFunction({
  name: "decide_application",
  input: {
    application_id: input.int({ required: true }),
    decided_by: input.int({ required: true }),
  },
  stack: [
    // 1. Load the application (field-match binds null on no match, so the guard
    //    below fails cleanly instead of the request 500ing).
    s.db.get({ table: applications, fieldName: "id", fieldValue: inp("application_id"), as: "application" }),
    s.precondition({
      expr: expr(ref("application", { safe: true }), "!=", c.null()),
      error: c.text("Application not found."),
      error_type: "notfound",
    }),
    // 2. Load its applicant.
    s.db.get({ table: applicants, fieldName: "id", fieldValue: ref("application.applicant_id"), as: "applicant" }),
    s.precondition({
      expr: expr(ref("applicant", { safe: true }), "!=", c.null()),
      error: c.text("Applicant not found."),
      error_type: "notfound",
    }),
    // 3. Load the one active rule set.
    s.db.query({ table: ruleSets, where: expr(col("status"), "=", c.text("active")), returnType: "single", as: "active_rs" }),
    s.precondition({
      expr: expr(ref("active_rs", { safe: true }), "!=", c.null()),
      error: c.text("No active rule set is configured."),
      error_type: "standard",
    }),
    // 4. Load its rules in evaluation order.
    s.db.query({
      table: decisionRules,
      where: expr(col("rule_set_id"), "=", ref("active_rs.id")),
      sort: [{ sortBy: "priority", dir: "asc" }],
      as: "rules",
    }),
    // 5. Encode employment_status once (it does not change per rule).
    s.set_var("employment_code", c.int(1)),
    s.switch({
      on: ref("applicant.employment_status"),
      cases: [
        { when: c.text("employed"), body: [s.update_var("employment_code", c.int(1))], break: true },
        { when: c.text("self_employed"), body: [s.update_var("employment_code", c.int(2))], break: true },
        { when: c.text("unemployed"), body: [s.update_var("employment_code", c.int(3))], break: true },
      ],
    }),
    // 6. Default outcome when NO rule fires: refer to a human.
    s.set_var("outcome", c.text("refer")),
    s.set_var("fired_rule_id", c.int(0)),
    s.set_var("fired_rule_name", c.text("No matching rule")),
    s.set_var("fired_rule_reason", c.text("No policy rule matched this application. Routed to manual review.")),
    // 7. Walk the waterfall: the first rule whose condition holds fires, then stop.
    s.foreach({
      as: "rule",
      list: ref("rules"),
      body: [
        // 7a. Select the metric value this rule tests.
        s.set_var("metric_value", c.decimal(0)),
        s.switch({
          on: ref("rule.metric"),
          cases: [
            { when: c.text("credit_score"), body: [s.update_var("metric_value", ref("applicant.credit_score"))], break: true },
            { when: c.text("dti_ratio"), body: [s.update_var("metric_value", ref("application.dti_ratio"))], break: true },
            { when: c.text("loan_amount"), body: [s.update_var("metric_value", ref("application.loan_amount"))], break: true },
            { when: c.text("employment_status"), body: [s.update_var("metric_value", ref("employment_code"))], break: true },
          ],
        }),
        // 7b. Evaluate: metric_value <operator> threshold.
        s.set_var("matched", c.bool(false)),
        s.switch({
          on: ref("rule.operator"),
          cases: [
            { when: c.text("lt"), body: [s.conditional({ when: expr(ref("metric_value"), "<", ref("rule.threshold")), then: [s.update_var("matched", c.bool(true))] })], break: true },
            { when: c.text("lte"), body: [s.conditional({ when: expr(ref("metric_value"), "<=", ref("rule.threshold")), then: [s.update_var("matched", c.bool(true))] })], break: true },
            { when: c.text("gt"), body: [s.conditional({ when: expr(ref("metric_value"), ">", ref("rule.threshold")), then: [s.update_var("matched", c.bool(true))] })], break: true },
            { when: c.text("gte"), body: [s.conditional({ when: expr(ref("metric_value"), ">=", ref("rule.threshold")), then: [s.update_var("matched", c.bool(true))] })], break: true },
            { when: c.text("eq"), body: [s.conditional({ when: expr(ref("metric_value"), "=", ref("rule.threshold")), then: [s.update_var("matched", c.bool(true))] })], break: true },
          ],
        }),
        // 7c. First match wins: record the firing rule and stop the waterfall.
        s.conditional({
          when: expr(ref("matched"), "=", c.bool(true)),
          then: [
            s.update_var("outcome", ref("rule.outcome")),
            s.update_var("fired_rule_id", ref("rule.id")),
            s.update_var("fired_rule_name", ref("rule.name")),
            s.update_var("fired_rule_reason", ref("rule.reason")),
            s.foreach_break(),
          ],
        }),
      ],
    }),
    // 8. Write the immutable audit row.
    s.db.add({
      table: decisions,
      row: {
        application_id: ref("application.id"),
        rule_set_id: ref("active_rs.id"),
        rule_set_version: ref("active_rs.version"),
        outcome: ref("outcome"),
        fired_rule_id: ref("fired_rule_id"),
        fired_rule_name: ref("fired_rule_name"),
        fired_rule_reason: ref("fired_rule_reason"),
        dti_ratio: ref("application.dti_ratio"),
        decided_by: inp("decided_by"),
      },
      as: "decision",
    }),
    // 9. Flip the application to decided.
    s.db.edit({ table: applications, fieldName: "id", fieldValue: ref("application.id"), row: { status: "decided" } }),
  ],
  response: {
    decision_id: ref("decision.id"),
    application_id: ref("application.id"),
    outcome: ref("outcome"),
    fired_rule_id: ref("fired_rule_id"),
    fired_rule_name: ref("fired_rule_name"),
    fired_rule_reason: ref("fired_rule_reason"),
    rule_set_id: ref("active_rs.id"),
    rule_set_version: ref("active_rs.version"),
    rule_set_name: ref("active_rs.name"),
    dti_ratio: ref("application.dti_ratio"),
  },
});
