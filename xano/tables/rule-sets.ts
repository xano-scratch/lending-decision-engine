import { table, f } from "@xanots/sdk";
import { RULE_SET_STATUS } from "../shared/enums.js";

/**
 * A versioned policy container. Exactly one row is `active` at a time; a `draft`
 * can still have its rules edited, and activating a version archives the old one.
 * Bumping the active version is the governance action that changes future decisions.
 */
export const ruleSets = table({
  name: "rule_sets",
  schema: {
    version: f.int({ required: true }),
    name: f.text({ required: true }),
    status: f.enum(RULE_SET_STATUS, { required: true, default: "draft" }),
    notes: f.text(),
  },
  index: [{ type: "btree", fields: [{ name: "status" }] }],
});
