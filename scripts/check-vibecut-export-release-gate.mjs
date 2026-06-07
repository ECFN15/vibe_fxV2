import { readFile } from "node:fs/promises";
import path from "node:path";

const statusPath = path.join(process.cwd(), "docs", "vibecut-export-hardening-status-2026-06-06.md");
const status = await readFile(statusPath, "utf8");

const blockers = [];

function addBlocker(condition, message) {
  if (condition) {
    blockers.push(message);
  }
}

addBlocker(
  /pre-release hardening/.test(status) || /pas `Go release beta`/.test(status),
  "Le statut courant est encore pre-release hardening, pas Go release beta.",
);
addBlocker(
  /Phase 5[\s\S]*Partial/.test(status),
  "Phase 5 renderer-first partielle: renderer frame-by-frame/fixtures MP4 finales non prouves.",
);
addBlocker(
  /Phase 6[\s\S]*Partial live/.test(status),
  "Phase 6 live partielle: passage Cloud Run prive/IAM/rotation secret non execute.",
);
addBlocker(
  /Phase 7[\s\S]*Partial/.test(status),
  "Phase 7 orchestration partielle: callable encore synchrone, worker async non implemente.",
);
addBlocker(
  /Phase 9[\s\S]*Partial live/.test(status),
  "Phase 9 partielle: smoke direct Cloud Run OK, mais callable Firebase/taskQueue/fixtures Cloud non termines.",
);
addBlocker(
  /Java 21\+ absent/.test(status) || /firebase-tools no longer supports Java version before 21/.test(status),
  "Gate emulateurs bloque localement: Java 21+ indisponible.",
);
addBlocker(
  !/npm run test:vibecut-k1-local-mp4` : OK[\s\S]*1080x1920[\s\S]*H\.264[\s\S]*5\.5s[\s\S]*audio present/.test(status),
  "Smoke MP4 local K1 non prouve.",
);
addBlocker(
  /MP4 finaux des fixtures pro supportees[\s\S]*non generes/.test(status),
  "Cloud Run live partiel: les MP4 finaux des fixtures pro supportees ne sont pas generes/verifies.",
);
addBlocker(
  /OK pour smoke live Cloud Run K1/.test(status),
  "Confirmation utilisateur live K1 encore requise avant toute commande Cloud/export payante.",
);
addBlocker(
  /Deploy Functions\/App Hosting[\s\S]*non execute/.test(status),
  "Deploy Functions/App Hosting non execute dans cette passe.",
);

if (blockers.length > 0) {
  console.error("check-vibecut-export-release-gate: BLOCKED");
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  console.error("\nCe gate est non mutant. Il doit echouer tant que la release beta n'est pas prouvee.");
  process.exit(1);
}

console.log("check-vibecut-export-release-gate: ready for Go release beta");
