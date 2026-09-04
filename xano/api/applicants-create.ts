import { query, input, s, ref, inp } from "@xanots/sdk";
import { lending } from "./group.js";
import { applicants } from "../tables/applicants.js";
import { users } from "../tables/users.js";
import { requireRole } from "../shared/guards.js";
import { EMPLOYMENT } from "../shared/enums.js";

/** Create an applicant. Role: underwriter or admin. */
export const createApplicantQuery = query({
  name: "applicants",
  verb: "POST",
  apiGroup: lending,
  auth: users,
  input: {
    full_name: input.text({ required: true }),
    email: input.email({ required: true }),
    annual_income: input.int({ required: true }),
    employment_status: input.enum(EMPLOYMENT, { required: true }),
    monthly_debt: input.int({ required: true }),
    credit_score: input.int({ required: true }),
  },
  stack: [
    ...requireRole("underwriter", "admin"),
    s.db.add({
      table: applicants,
      row: {
        full_name: inp("full_name"),
        email: inp("email"),
        annual_income: inp("annual_income"),
        employment_status: inp("employment_status"),
        monthly_debt: inp("monthly_debt"),
        credit_score: inp("credit_score"),
      },
      as: "applicant",
    }),
  ],
  response: ref("applicant"),
});
