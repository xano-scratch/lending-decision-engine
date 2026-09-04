import { query, s, ref } from "@xanots/sdk";
import { lending } from "./group.js";
import { applications } from "../tables/applications.js";
import { users } from "../tables/users.js";

/** List applications, newest first. Any signed-in role (viewer and up). */
export const listApplicationsQuery = query({
  name: "applications/list",
  verb: "GET",
  apiGroup: lending,
  auth: users,
  stack: [s.db.query({ table: applications, sort: [{ sortBy: "created_at", dir: "desc" }], as: "rows" })],
  response: ref("rows"),
});
