import { query, s, ref } from "@xanots/sdk";
import { lending } from "./group.js";
import { ruleSets } from "../tables/rule-sets.js";
import { users } from "../tables/users.js";

/** List rule sets by version. Any signed-in role (viewer and up). */
export const listRuleSetsQuery = query({
  name: "rule-sets/list",
  verb: "GET",
  apiGroup: lending,
  auth: users,
  stack: [s.db.query({ table: ruleSets, sort: [{ sortBy: "version", dir: "asc" }], as: "rows" })],
  response: ref("rows"),
});
