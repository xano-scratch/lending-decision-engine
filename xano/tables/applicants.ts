import { table, f } from "@xanots/sdk";
import { EMPLOYMENT } from "../shared/enums.js";

/** A person applying for credit. Holds the raw facts a rule tests. */
export const applicants = table({
  name: "applicants",
  schema: {
    full_name: f.text({ required: true }),
    email: f.email({ required: true }),
    annual_income: f.int({ required: true }),
    employment_status: f.enum(EMPLOYMENT, { required: true }),
    monthly_debt: f.int({ required: true }),
    credit_score: f.int({ required: true }),
  },
});
