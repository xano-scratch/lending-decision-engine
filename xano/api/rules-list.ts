import { query, s, ref } from "@xanots/sdk";
import { lending } from "./group.js";
import { decisionRules } from "../tables/decision-rules.js";
import { users } from "../tables/users.js";

/**
 * List every decision rule, grouped-friendly (by rule set, then priority). The
 * UI groups these under their rule set. Any signed-in role (viewer and up).
 */
export const listRulesQuery = query({
  name: "rules/list",
  verb: "GET",
  apiGroup: lending,
  auth: users,
  stack: [
    s.db.query({
      table: decisionRules,
      sort: [
        { sortBy: "rule_set_id", dir: "asc" },
        { sortBy: "priority", dir: "asc" },
      ],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
