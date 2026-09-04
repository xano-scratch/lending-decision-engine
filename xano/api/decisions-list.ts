import { query, s, ref } from "@xanots/sdk";
import { lending } from "./group.js";
import { decisions } from "../tables/decisions.js";
import { users } from "../tables/users.js";

/**
 * The audit trail: every decision, newest first. Each row is self-contained (it
 * snapshots the outcome, firing rule, and rule-set version), so no join is needed.
 * Any signed-in role (viewer and up).
 */
export const listDecisionsQuery = query({
  name: "decisions/list",
  verb: "GET",
  apiGroup: lending,
  auth: users,
  stack: [s.db.query({ table: decisions, sort: [{ sortBy: "created_at", dir: "desc" }], as: "rows" })],
  response: ref("rows"),
});
