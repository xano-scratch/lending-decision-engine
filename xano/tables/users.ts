import { table, f } from "@xanots/sdk";
import { ROLE } from "../shared/enums.js";

/**
 * The auth table. Backs native API-layer RBAC: a login endpoint mints a token
 * with `s.security.create_auth_token`, and every protected endpoint names this
 * table as `auth:` and gates on `role` with an `s.precondition`. No row-level
 * security anywhere; permissions live at the API layer.
 */
export const users = table({
  name: "users",
  auth: true,
  schema: {
    email: f.email({ required: true }),
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(ROLE, { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
