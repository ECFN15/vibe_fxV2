"use strict";

function shouldEnforceAppCheck(flagName, env = process.env) {
  const value = String(env[flagName] || "").trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  if (env.FUNCTIONS_EMULATOR === "true") return false;
  return true;
}

module.exports = {
  shouldEnforceAppCheck,
};
