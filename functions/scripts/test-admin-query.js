/**
 * Test direct de la query Firestore admin pour voir si les jobs remontent.
 * Execute: node functions/scripts/test-admin-query.js
 */
process.env.GOOGLE_CLOUD_PROJECT = "vibefx-v2";

const admin = require("firebase-admin");

// Init via ADC (firebase-tools credentials)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "vibefx-v2",
});

async function main() {
  const db = admin.firestore();

  // 1. Count total docs dans videoExportJobs
  const all = await db.collection("videoExportJobs").get();
  console.log("Total videoExportJobs docs:", all.size);
  all.docs.forEach(d => {
    const f = d.data();
    console.log(" ", d.id, "| uid:", f.uid, "| status:", f.status, "| createdAt:", f.createdAt?.toDate?.()?.toISOString());
  });

  // 2. Test la query exacte de la callable
  console.log("\n--- Query callable (orderBy createdAt desc, limit 120) ---");
  const snap = await db.collection("videoExportJobs").orderBy("createdAt", "desc").limit(120).get();
  console.log("Docs retournés:", snap.size);
  snap.docs.forEach(d => {
    const f = d.data();
    console.log(" ", d.id, "| status:", f.status, "| estimatedTotalCostEur:", f.estimatedTotalCostEur);
  });
}

main().catch(e => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
