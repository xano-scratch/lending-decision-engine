import { query, input, s, ref, inp, auth } from "@xanots/sdk";
import { lending } from "./group.js";
import { users } from "../tables/users.js";
import { requireRole } from "../shared/guards.js";
import { decideApplication } from "../functions/decide-application.js";

/**
 * Run the decision waterfall for one application, through the shared
 * `decide_application` function (the one place the credit rules live). Records
 * the caller as `decided_by`. Role: underwriter or admin.
 */
export const decideApplicationQuery = query({
  name: "applications/decide",
  verb: "POST",
  apiGroup: lending,
  auth: users,
  input: {
    application_id: input.int({ required: true }),
  },
  stack: [
    ...requireRole("underwriter", "admin"),
    s.function.run({
      fn: decideApplication,
      input: { application_id: inp("application_id"), decided_by: auth("id") },
      as: "result",
    }),
  ],
  response: ref("result"),
});
