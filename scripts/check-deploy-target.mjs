const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();

const blockedProjectPatterns = [
  new RegExp(["jar", "din"].join(".*"), "i"),
  new RegExp(["cha", "wi"].join(""), "i"),
  /^demo-/i,
];

console.log("Firebase deploy target readiness");

if (!projectId) {
  console.log("\nMissing deploy target:");
  console.log("- FIREBASE_PROJECT_ID");
  console.log("\nSet FIREBASE_PROJECT_ID to the dedicated Vibe_fx V2 Firebase project before deploying backend resources.");
  process.exit(1);
}

const blockedPattern = blockedProjectPatterns.find((pattern) => pattern.test(projectId));
if (blockedPattern) {
  console.log(`\nRefusing deploy target: ${projectId}`);
  console.log("- Use a dedicated production/staging Firebase project for Vibe_fx V2.");
  process.exit(1);
}

console.log(`deploy target OK: ${projectId}`);
