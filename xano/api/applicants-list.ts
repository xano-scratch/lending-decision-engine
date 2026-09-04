import { query, s, ref } from "@xanots/sdk";
import { lending } from "./group.js";
import { applicants } from "../tables/applicants.js";
import { users } from "../tables/users.js";

/** List applicants, newest first. Any signed-in role (viewer and up). */
export const listApplicantsQuery = query({
  name: "applicants/list",
  verb: "GET",
  apiGroup: lending,
  auth: users,
  stack: [s.db.query({ table: applicants, sort: [{ sortBy: "created_at", dir: "desc" }], as: "rows" })],
  response: ref("rows"),
});
