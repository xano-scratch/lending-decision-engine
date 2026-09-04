import { apiGroup } from "@xanots/sdk";

/**
 * The one API group. Its canonical slug is PINNED so every public path is stable
 * (`/api:lending/...`) and `getPath()` resolves in the browser bundle from source.
 */
export const lending = apiGroup({ name: "lending", canonical: "lending" });
