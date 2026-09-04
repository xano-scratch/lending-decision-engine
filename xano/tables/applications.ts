import { table, f } from "@xanots/sdk";
import { applicants } from "./applicants.js";
import { PURPOSE, APPLICATION_STATUS } from "../shared/enums.js";

/**
 * A loan request tied to one applicant. `dti_ratio` (debt to income) is computed
 * at submit as monthly_debt * 12 / annual_income and stored, so a decision reads
 * the ratio that was true at submit time.
 */
export const applications = table({
  name: "applications",
  schema: {
    applicant_id: f.tableRef(applicants, { required: true }),
    loan_amount: f.int({ required: true }),
    term_months: f.int({ required: true }),
    purpose: f.enum(PURPOSE, { required: true }),
    dti_ratio: f.decimal({ required: true, default: 0 }),
    status: f.enum(APPLICATION_STATUS, { required: true, default: "submitted" }),
  },
  index: [{ type: "btree", fields: [{ name: "applicant_id" }] }],
});
