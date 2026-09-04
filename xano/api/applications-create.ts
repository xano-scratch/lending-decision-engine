import { query, input, s, c, ref, inp, expr, withFilters, fl } from "@xanots/sdk";
import { lending } from "./group.js";
import { applications } from "../tables/applications.js";
import { applicants } from "../tables/applicants.js";
import { users } from "../tables/users.js";
import { requireRole } from "../shared/guards.js";
import { PURPOSE } from "../shared/enums.js";

/**
 * Submit an application. Validates the applicant exists, computes and stores the
 * DTI ratio (monthly_debt * 12 / annual_income), and sets status = submitted.
 * Role: underwriter or admin.
 */
export const createApplicationQuery = query({
  name: "applications",
  verb: "POST",
  apiGroup: lending,
  auth: users,
  input: {
    applicant_id: input.int({ required: true }),
    loan_amount: input.int({ required: true }),
    term_months: input.int({ required: true }),
    purpose: input.enum(PURPOSE, { required: true }),
  },
  stack: [
    ...requireRole("underwriter", "admin"),
    s.db.get({ table: applicants, fieldName: "id", fieldValue: inp("applicant_id"), as: "applicant" }),
    s.precondition({
      expr: expr(ref("applicant", { safe: true }), "!=", c.null()),
      error: c.text("Applicant not found."),
      error_type: "notfound",
    }),
    s.precondition({
      expr: expr(ref("applicant.annual_income"), ">", c.int(0)),
      error: c.text("Applicant annual income must be greater than zero."),
      error_type: "badrequest",
    }),
    s.set_var("dti_ratio", withFilters(ref("applicant.monthly_debt"), fl.mul(12), fl.div(ref("applicant.annual_income")))),
    s.db.add({
      table: applications,
      row: {
        applicant_id: inp("applicant_id"),
        loan_amount: inp("loan_amount"),
        term_months: inp("term_months"),
        purpose: inp("purpose"),
        dti_ratio: ref("dti_ratio"),
        status: "submitted",
      },
      as: "application",
    }),
  ],
  response: ref("application"),
});
