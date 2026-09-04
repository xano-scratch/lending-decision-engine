// Shared enum value sets. Declared once so a table column (`f.enum`) and the
// matching endpoint input (`input.enum`) always agree on the member union.
export const ROLE = ["admin", "underwriter", "viewer"] as const;
export const EMPLOYMENT = ["employed", "self_employed", "unemployed"] as const;
export const PURPOSE = ["auto", "home_improvement", "debt_consolidation", "personal"] as const;
export const APPLICATION_STATUS = ["submitted", "decided"] as const;
export const RULE_SET_STATUS = ["draft", "active", "archived"] as const;
export const METRIC = ["credit_score", "dti_ratio", "loan_amount", "employment_status"] as const;
export const OPERATOR = ["lt", "lte", "gt", "gte", "eq"] as const;
export const OUTCOME = ["approve", "refer", "decline"] as const;
