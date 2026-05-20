import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { shouldEnforceAppCheck } = require("../functions/src/appCheck.js");

assert.equal(shouldEnforceAppCheck("ENFORCE_AI_APP_CHECK", {}), true);
assert.equal(shouldEnforceAppCheck("ENFORCE_AI_APP_CHECK", { ENFORCE_AI_APP_CHECK: "true" }), true);
assert.equal(shouldEnforceAppCheck("ENFORCE_AI_APP_CHECK", { ENFORCE_AI_APP_CHECK: "false" }), false);
assert.equal(shouldEnforceAppCheck("ENFORCE_AI_APP_CHECK", { FUNCTIONS_EMULATOR: "true" }), false);
assert.equal(shouldEnforceAppCheck("ENFORCE_AI_APP_CHECK", {
  FUNCTIONS_EMULATOR: "true",
  ENFORCE_AI_APP_CHECK: "true",
}), true);
assert.equal(shouldEnforceAppCheck("ENFORCE_BILLING_APP_CHECK", { ENFORCE_BILLING_APP_CHECK: "FALSE" }), false);
assert.equal(shouldEnforceAppCheck("ENFORCE_META_APP_CHECK", { ENFORCE_META_APP_CHECK: " TRUE " }), true);
assert.equal(shouldEnforceAppCheck("ENFORCE_ACCOUNT_APP_CHECK", { ENFORCE_ACCOUNT_APP_CHECK: "false" }), false);
assert.equal(shouldEnforceAppCheck("ENFORCE_ACCOUNT_APP_CHECK", {}), true);

console.log("app check smoke test OK");
