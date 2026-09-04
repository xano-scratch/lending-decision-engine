import { table, f } from "@xanots/sdk";
import { applications } from "./applications.js";
import { ruleSets } from "./rule-sets.js";
import { decisionRules } from "./decision-rules.js";
import { users } from "./users.js";
import { OUTCOME } from "../shared/enums.js";

/**
 * The immutable audit row a decision writes. It SNAPSHOTS everything that
 * produced the outcome: the rule-set version, the firing rule's name and reason,
 * and the DTI at decision time. Re-deciding under a different version writes a
 * NEW row, so the whole decision history is preserved. `fired_rule_id` is 0 when
 * no rule matched (the default refer outcome).
 */
export const decisions = table({
  name: "decisions",
  schema: {
    application_id: f.tableRef(applications, { required: true }),
    rule_set_id: f.tableRef(ruleSets, { required: true }),
    rule_set_version: f.int({ required: true }),
    outcome: f.enum(OUTCOME, { required: true }),
    fired_rule_id: f.tableRef(decisionRules, { required: true, default: 0 }),
    fired_rule_name: f.text({ required: true }),
    fired_rule_reason: f.text({ required: true }),
    dti_ratio: f.decimal({ required: true, default: 0 }),
    decided_by: f.tableRef(users, { required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "application_id" }] }],
});
