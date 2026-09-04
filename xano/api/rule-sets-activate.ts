import { query, input, s, c, ref, inp, col, expr } from "@xanots/sdk";
import { lending } from "./group.js";
import { ruleSets } from "../tables/rule-sets.js";
import { users } from "../tables/users.js";
import { requireRole } from "../shared/guards.js";

/**
 * Activate a rule-set version and archive the previously active one. This is the
 * governance action that changes every future decision. Role: admin only.
 */
export const activateRuleSetQuery = query({
  name: "rule-sets/activate",
  verb: "POST",
  apiGroup: lending,
  auth: users,
  input: {
    rule_set_id: input.int({ required: true }),
  },
  stack: [
    ...requireRole("admin"),
    s.db.get({ table: ruleSets, fieldName: "id", fieldValue: inp("rule_set_id"), as: "target" }),
    s.precondition({
      expr: expr(ref("target", { safe: true }), "!=", c.null()),
      error: c.text("Rule set not found."),
      error_type: "notfound",
    }),
    // Archive whichever set is currently active (there is at most one).
    s.db.query({ table: ruleSets, where: expr(col("status"), "=", c.text("active")), returnType: "single", as: "current" }),
    s.conditional({
      when: expr(ref("current", { safe: true }), "!=", c.null()),
      then: [s.db.edit({ table: ruleSets, fieldName: "id", fieldValue: ref("current.id"), row: { status: "archived" } })],
    }),
    s.db.edit({ table: ruleSets, fieldName: "id", fieldValue: ref("target.id"), row: { status: "active" }, as: "activated" }),
  ],
  response: ref("activated"),
});
