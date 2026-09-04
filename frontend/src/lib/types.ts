import type { Applicant, Application, Decision, RuleSet, Rule, Role } from "./api";

export interface AppData {
  applicants: Applicant[];
  applications: Application[];
  decisions: Decision[];
  ruleSets: RuleSet[];
  rules: Rule[];
}

export type Notify = (message: string, kind?: "success" | "error" | "info") => void;

export interface ViewProps {
  data: AppData;
  role: Role;
  refresh: () => Promise<void>;
  notify: Notify;
}
