import { statements, s, c, ref, auth, expr, or } from "@xanots/sdk";
import { users } from "../tables/users.js";
import type { ROLE } from "./enums.js";

type Role = (typeof ROLE)[number];

/**
 * API-layer RBAC. Spread into a protected endpoint's stack AFTER declaring
 * `auth: users` (which already rejects an unauthenticated call). It loads the
 * caller's row and rejects (403) any caller whose `role` is not in `roles`.
 *
 * Returns `statements(...)` (a fixed-arity tuple), not a bare `Statement[]`, so
 * spreading it keeps the stack's tuple type and every later `ref()` still infers.
 */
export function requireRole(...roles: Role[]) {
  const check =
    roles.length === 1
      ? expr(ref("me.role"), "=", c.text(roles[0]))
      : or(...roles.map((r) => expr(ref("me.role"), "=", c.text(r))));
  return statements(
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me" }),
    s.precondition({
      expr: check,
      error: c.text(`This action requires the ${roles.join(" or ")} role.`),
      error_type: "accessdenied",
    }),
  );
}
