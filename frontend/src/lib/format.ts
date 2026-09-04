// Small display helpers. Values from Xano may arrive as numbers or numeric
// strings (decimals), so coerce with Number() before formatting.

export const money = (n: number | string) => `$${Math.round(Number(n)).toLocaleString("en-US")}`;

export const pct = (ratio: number | string) => `${Math.round(Number(ratio) * 100)}%`;

export const when = (ms: number | string) =>
  new Date(Number(ms)).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// "home_improvement" -> "Home improvement", "self_employed" -> "Self employed"
export const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const OPERATOR_SYMBOL: Record<string, string> = {
  lt: "<",
  lte: "≤",
  gt: ">",
  gte: "≥",
  eq: "=",
};

export const METRIC_LABEL: Record<string, string> = {
  credit_score: "Credit score",
  dti_ratio: "DTI ratio",
  loan_amount: "Loan amount",
  employment_status: "Employment",
};
