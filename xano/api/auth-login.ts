import { query, input, s, c, ref, inp, expr, obj } from "@xanots/sdk";
import { lending } from "./group.js";
import { users } from "../tables/users.js";

/**
 * Mint an auth token from the users table. Public. The password comes in as
 * `input.text` (NOT `input.password`) so it is not hashed a second time on bind,
 * which would make `check_password` compare two different hashes and always fail.
 */
export const loginQuery = query({
  name: "auth/login",
  verb: "POST",
  apiGroup: lending,
  input: {
    email: input.email({ required: true }),
    password: input.text({ required: true }),
  },
  stack: [
    // `output` must name `password`: the column is access:internal and is absent
    // from the row otherwise, so check_password could not read it.
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error: c.text("Invalid email or password."),
      error_type: "unauthorized",
    }),
    s.security.check_password({ text_password: inp("password"), hash_password: ref("u.password"), as: "ok" }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error: c.text("Invalid email or password."),
      error_type: "unauthorized",
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    user: obj({ id: ref("u.id"), email: ref("u.email"), name: ref("u.name"), role: ref("u.role") }),
  },
});
