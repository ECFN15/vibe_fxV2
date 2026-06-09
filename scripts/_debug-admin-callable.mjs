/**
 * Simule exactement ce que le front fait :
 * 1. Signe un custom token JWT via iam.signJwt (service account firebase-adminsdk)
 * 2. L'échange contre un ID token Firebase via signInWithCustomToken
 * 3. App Check debug token
 * 4. Appelle getVideoExportAdminTelemetry
 */
import { readFileSync } from "fs";
import { createHmac, createSign } from "crypto";

for (const line of readFileSync("C:\\Users\\pcpor\\OneDrive\\Bureau\\mes projet\\vibe_fxV2\\.env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const API_KEY  = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT  = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const REGION   = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "europe-west9";
const APP_ID   = "1:663698546037:web:cbeb8e828df3a41455c73c";
const APPCHECK_DEBUG_TOKEN = "efc8e844-e13a-4b58-8d30-084e3bf6d0db";
const ADC_PATH = "C:\\Users\\pcpor\\AppData\\Roaming\\firebase\\matthis_fradin2_gmail.com_application_default_credentials.json";
const MATTHIS_UID  = "h1sXDqyUtabLDzZovygWDYC5nZ73";
const SA_EMAIL = "firebase-adminsdk-fbsvc@vibefx-v2.iam.gserviceaccount.com";

// 1. OAuth access token
const adc = JSON.parse(readFileSync(ADC_PATH, "utf8"));
const oauthResp = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: adc.client_id, client_secret: adc.client_secret, refresh_token: adc.refresh_token, grant_type: "refresh_token" }),
});
const { access_token } = await oauthResp.json();
console.log("✓ OAuth access token len:", access_token?.length);

// 2. Construire le payload JWT pour custom token Firebase
const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: SA_EMAIL,
  sub: SA_EMAIL,
  aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
  iat: now,
  exp: now + 3600,
  uid: MATTHIS_UID,
  claims: { email: "matthis.fradin2@gmail.com" },
};

// Header base64url
function b64url(obj) {
  return Buffer.from(typeof obj === "string" ? obj : JSON.stringify(obj)).toString("base64url");
}
const unsigned = b64url({ alg: "RS256", typ: "JWT" }) + "." + b64url(payload);

// 3. Signer via IAM signBlob
const signResp = await fetch(
  `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts/${SA_EMAIL}:signBlob`,
  {
    method: "POST",
    headers: { authorization: `Bearer ${access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ bytesToSign: Buffer.from(unsigned).toString("base64") }),
  }
);
const signBody = await signResp.json();
if (!signBody.signature && !signBody.signedBlob) {
  console.error("signBlob FAILED:", JSON.stringify(signBody).slice(0, 300));
  process.exit(1);
}
const sig = (signBody.signature || signBody.signedBlob).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
const customToken = unsigned + "." + sig;
console.log("✓ Custom token signed, len:", customToken.length);

// 4. Échanger custom token contre ID token Firebase
const signInResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: customToken, returnSecureToken: true }),
});
const signInBody = await signInResp.json();
if (!signInBody.idToken) {
  console.error("signInWithCustomToken FAILED:", JSON.stringify(signInBody).slice(0, 300));
  process.exit(1);
}
const idToken = signInBody.idToken;
console.log("✓ Firebase ID token len:", idToken.length);

// 5. App Check debug token
const acResp = await fetch(
  `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT}/apps/${APP_ID}:exchangeDebugToken?key=${API_KEY}`,
  { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ debug_token: APPCHECK_DEBUG_TOKEN }) }
);
const acBody = await acResp.json();
const appCheckToken = acBody.token;
if (!appCheckToken) {
  console.error("App Check FAILED:", JSON.stringify(acBody).slice(0, 200));
  process.exit(1);
}
console.log("✓ App Check token len:", appCheckToken.length);

// 6. Appel callable
const callableUrl = `https://${REGION}-${PROJECT}.cloudfunctions.net/getVideoExportAdminTelemetry`;
console.log("\n→ Calling:", callableUrl);

const callResp = await fetch(callableUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "authorization": `Bearer ${idToken}`,
    "x-firebase-appcheck": appCheckToken,
  },
  body: JSON.stringify({ data: { limit: 20 } }),
});
const callBody = await callResp.text();
console.log("Status:", callResp.status);

if (callResp.ok) {
  const result = JSON.parse(callBody);
  const data = result.result || result;
  console.log("\n✓ SUCCESS");
  console.log("  scope:", data.scope);
  console.log("  jobs:", data.jobs?.length);
  console.log("  summary:", JSON.stringify(data.summary));
  data.jobs?.slice(0, 5).forEach(j => console.log("  job:", j.id, "|", j.status, "|", j.estimatedTotalCostEur, "EUR"));
} else {
  console.error("\n✗ FAILED:", callBody.slice(0, 500));
}
