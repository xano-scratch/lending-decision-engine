import { table, f } from "@xanots/sdk";
import { ruleSets } from "./rule-sets.js";
import { METRIC, OPERATOR, OUTCOME } from "../shared/enums.js";

/**
 * One rule in a rule set's ordered waterfall. The engine walks a set's rules by
 * `priority` ascending and fires the FIRST whose `<metric> <operator> <threshold>`
 * holds. `employment_status` is compared as a risk-ordered code (see the decide
 * function), so one numeric comparison path serves every metric.
 */
export const decisionRules = table({
  name: "decision_rules",
  schema: {
    rule_set_id: f.tableRef(ruleSets, { required: true }),
    priority: f.int({ required: true }),
    name: f.text({ required: true }),
    metric: f.enum(METRIC, { required: true }),
    operator: f.enum(OPERATOR, { required: true }),
    threshold: f.decimal({ required: true, default: 0 }),
    outcome: f.enum(OUTCOME, { required: true }),
    reason: f.text({ required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "rule_set_id" }] }],
});
