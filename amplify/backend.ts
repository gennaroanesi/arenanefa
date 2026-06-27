import { defineBackend } from "@aws-amplify/backend";
import { data } from "./data/resource";

/**
 * Copa 2026 backend. Data-only for now (no auth, no functions). Add
 * `defineAuth` / `defineFunction` here when name+PIN self-serve lands.
 */
defineBackend({
  data,
});
