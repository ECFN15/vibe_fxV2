/**
 * Test direct de getVideoExportAdminTelemetry avec le compte matthis.
 */
import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Charge le .env.local
const envPath = "C:\\Users\\pcpor\\OneDrive\\Bureau\\mes projet\\vibe_fxV2\\.env.local";
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const API_KEY   = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const REGION    = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "europe-west9";
const ADC_PATH  = "C:\\Users\\pcpor\\AppData\\Roaming\\firebase\\matthis_fradin2_gmail.com_application_default_credentials.json";

// 1. Obtenir un ID token Firebase pour matthis via REST (sign-in avec custom token)
// On utilise le refresh token ADC pour obtenir un access token Google, puis on signe
// en tant qu'utilisateur Firebase via l'API REST identitytoolkit

const adc = JSON.parse(readFileSync(ADC_PATH, "utf8"));

// Obtenir un access token OAuth2
const oauthResp = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: adc.client_id, client_secret: adc.client_secret, refresh_token: adc.refresh_token, grant_type: "refresh_token" }),
});
const { access_token } = await oauthResp.json();
console.log("✓ OAuth access token len:", access_token?.length);

// Obtenir le UID Firebase pour matthis via Firestore Admin
const adminsResp = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins?pageSize=5`,
  { headers: { authorization: `Bearer ${access_token}` } }
);
const adminsData = await adminsResp.json();
console.log("admins docs:", adminsData.documents?.map(d => d.name.split("/").pop()));

// Tester la callable directement avec le token OAuth (en tant qu'admin)
// La callable Firebase v2 accepte un access token Google si c'est un service account
// ou un ID token Firebase. On teste avec l'URL de la callable v2.
const callableUrl = `https://${REGION}-${PROJECT}.cloudfunctions.net/getVideoExportAdminTelemetry`;

const resp = await fetch(callableUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "authorization": `Bearer ${access_token}`,
  },
  body: JSON.stringify({ data: { limit: 10 } }),
});

const body = await resp.text();
console.log("callable status:", resp.status);
console.log("callable body (first 500):", body.slice(0, 500));
