import { workspace } from "@xanots/sdk";

// Tables
import { users } from "./tables/users.js";
import { applicants } from "./tables/applicants.js";
import { applications } from "./tables/applications.js";
import { ruleSets } from "./tables/rule-sets.js";
import { decisionRules } from "./tables/decision-rules.js";
import { decisions } from "./tables/decisions.js";

// API group
import { lending } from "./api/group.js";

// Shared function (the one governed job)
import { decideApplication } from "./functions/decide-application.js";

// Endpoints
import { loginQuery } from "./api/auth-login.js";
import { seedQuery } from "./api/seed.js";
import { createApplicantQuery } from "./api/applicants-create.js";
import { listApplicantsQuery } from "./api/applicants-list.js";
import { createApplicationQuery } from "./api/applications-create.js";
import { listApplicationsQuery } from "./api/applications-list.js";
import { decideApplicationQuery } from "./api/applications-decide.js";
import { listDecisionsQuery } from "./api/decisions-list.js";
import { decisionDetailQuery } from "./api/decisions-detail.js";
import { listRuleSetsQuery } from "./api/rule-sets-list.js";
import { listRulesQuery } from "./api/rules-list.js";
import { activateRuleSetQuery } from "./api/rule-sets-activate.js";
import { upsertRuleQuery } from "./api/rules-upsert.js";

/**
 * The lending-decision-engine backend: a governed loan decisioning API. Every
 * credit decision runs through one versioned rule-set waterfall and writes an
 * immutable audit row, so every intake app, partner API, and ops tool decides
 * the same way, from one auditable place.
 */
export default workspace("lending-decision-engine")
  .registerTables([users, applicants, applications, ruleSets, decisionRules, decisions])
  .registerApiGroups([lending])
  .registerFunctions([decideApplication])
  .registerQueries([
    loginQuery,
    seedQuery,
    createApplicantQuery,
    listApplicantsQuery,
    createApplicationQuery,
    listApplicationsQuery,
    decideApplicationQuery,
    listDecisionsQuery,
    decisionDetailQuery,
    listRuleSetsQuery,
    listRulesQuery,
    activateRuleSetQuery,
    upsertRuleQuery,
  ]);
