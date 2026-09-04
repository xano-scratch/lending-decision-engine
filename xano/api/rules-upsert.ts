import { query, input, s, c, ref, inp, expr } from "@xanots/sdk";
import { lending } from "./group.js";
import { decisionRules } from "../tables/decision-rules.js";
import { ruleSets } from "../tables/rule-sets.js";
import { users } from "../tables/users.js";
import { requireRole } from "../shared/guards.js";
import { METRIC, OPERATOR, OUTCOME } from "../shared/enums.js";

/**
 * Create (id omitted or 0) or edit (id > 0) a rule, only while its rule set is a
 * DRAFT. Active and archived versions are locked so the audit trail cannot be
 * rewritten. Role: underwriter or admin. The UI refetches the rules after.
 */
export const upsertRuleQuery = query({
  name: "rules/upsert",
  verb: "POST",
  apiGroup: lending,
  auth: users,
  input: {
    id: input.int(),
    rule_set_id: input.int({ required: true }),
    priority: input.int({ required: true }),
    name: input.text({ required: true }),
    metric: input.enum(METRIC, { required: true }),
    operator: input.enum(OPERATOR, { required: true }),
    threshold: input.decimal({ required: true }),
    outcome: input.enum(OUTCOME, { required: true }),
    reason: input.text({ required: true }),
  },
  stack: [
    ...requireRole("underwriter", "admin"),
    s.db.get({ table: ruleSets, fieldName: "id", fieldValue: inp("rule_set_id"), as: "rs" }),
    s.precondition({
      expr: expr(ref("rs", { safe: true }), "!=", c.null()),
      error: c.text("Rule set not found."),
      error_type: "notfound",
    }),
    s.precondition({
      expr: expr(ref("rs.status"), "=", c.text("draft")),
      error: c.text("Rules can only be edited while the rule set is a draft. Active and archived versions are locked."),
      error_type: "badrequest",
    }),
    s.conditional({
      when: expr(inp("id"), ">", c.int(0)),
      then: [
        s.db.edit({
          table: decisionRules,
          fieldName: "id",
          fieldValue: inp("id"),
          row: {
            rule_set_id: inp("rule_set_id"),
            priority: inp("priority"),
            name: inp("name"),
            metric: inp("metric"),
            operator: inp("operator"),
            threshold: inp("threshold"),
            outcome: inp("outcome"),
            reason: inp("reason"),
          },
        }),
      ],
      else: [
        s.db.add({
          table: decisionRules,
          row: {
            rule_set_id: inp("rule_set_id"),
            priority: inp("priority"),
            name: inp("name"),
            metric: inp("metric"),
            operator: inp("operator"),
            threshold: inp("threshold"),
            outcome: inp("outcome"),
            reason: inp("reason"),
          },
        }),
      ],
    }),
  ],
  response: { ok: c.bool(true), rule_set_id: inp("rule_set_id") },
});
