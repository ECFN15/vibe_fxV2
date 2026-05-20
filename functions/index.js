const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const billing = require("./src/billing");
const account = require("./src/account");
const aiJobs = require("./src/ai/jobs");
const aiReconciliation = require("./src/ai/reconciliation");
const { shouldEnforceAppCheck } = require("./src/appCheck");

admin.initializeApp();

exports.createCheckoutSession = billing.createCheckoutSession;
exports.stripeWebhook = billing.stripeWebhook;
exports.requestAccountDeletion = account.requestAccountDeletion;
exports.createAiJob = aiJobs.createAiJob;
exports.reconcileStaleAiReservations = aiReconciliation.reconcileStaleAiReservations;

const META_ACCESS_TOKEN = defineSecret("META_ACCESS_TOKEN");
const META_IG_USER_ID = defineSecret("META_IG_USER_ID");
const META_FACEBOOK_PAGE_ID = defineSecret("META_FACEBOOK_PAGE_ID");
const META_APP_ID = defineSecret("META_APP_ID");
const META_APP_SECRET = defineSecret("META_APP_SECRET");
const META_OAUTH_REDIRECT_URI = defineSecret("META_OAUTH_REDIRECT_URI");
const META_TOKEN_ENCRYPTION_KEY = defineSecret("META_TOKEN_ENCRYPTION_KEY");

const REGION = "europe-west9";
const ENFORCE_META_APP_CHECK = shouldEnforceAppCheck("ENFORCE_META_APP_CHECK");
const META_CONNECTION_ID = "default";
const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];

async function assertAdmin(request) {
  const email = request.auth?.token?.email?.toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const hasVerifiedAdminEmail = Boolean(email && adminEmails.includes(email));
  let hasAdminAccessDoc = false;
  if (email) {
    const snapshot = await admin.firestore().collection("admins").doc(email).get();
    hasAdminAccessDoc = snapshot.exists && snapshot.data()?.status === "active";
  }
  const isAdmin = request.auth?.token?.admin === true || hasVerifiedAdminEmail || hasAdminAccessDoc;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Acces admin requis.");
  }
}

function assertAuthenticated(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion utilisateur requise.");
  }
  return uid;
}

function metaConnectionRef(uid) {
  return admin.firestore().collection("meta_connections").doc(uid);
}

function getSecretValue(secret) {
  return String(secret.value() || "").trim();
}

function getGraphBase() {
  return `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v24.0"}`;
}

function getFacebookDialogBase() {
  return `https://www.facebook.com/${process.env.META_GRAPH_VERSION || "v24.0"}`;
}

function encryptMetaToken(token) {
  const secret = getSecretValue(META_TOKEN_ENCRYPTION_KEY);
  if (!secret || secret.length < 16) {
    throw new HttpsError("failed-precondition", "Secret META_TOKEN_ENCRYPTION_KEY manquant ou trop court.");
  }
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    value: encrypted.toString("base64"),
  };
}

function decryptMetaToken(payload) {
  const secret = getSecretValue(META_TOKEN_ENCRYPTION_KEY);
  if (!secret || !payload?.value || !payload?.iv || !payload?.tag) {
    throw new HttpsError("failed-precondition", "Connexion Meta OAuth incomplete.");
  }
  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.value, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function publicMetaConnection(data = {}) {
  return {
    connected: data.status === "connected",
    status: data.status || "not_connected",
    connectionId: META_CONNECTION_ID,
    pageId: data.pageId || "",
    pageName: data.pageName || "",
    igUserId: data.igUserId || "",
    igUsername: data.igUsername || "",
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
    tokenExpiresAt: data.tokenExpiresAt || null,
    connectedAt: data.connectedAt || null,
    updatedAt: data.updatedAt || null,
    lastError: data.lastError || "",
  };
}

function isExpiredTimestamp(timestamp) {
  return Boolean(timestamp?.toMillis && timestamp.toMillis() <= Date.now());
}

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isAlreadyPublished(platformStatus, platform) {
  return platformStatus?.[platform]?.status === "published";
}

function skippedResult(platformStatus, platform) {
  const current = platformStatus?.[platform] || {};
  return {
    status: "skipped",
    reason: "already_published",
    mediaId: current.mediaId || null,
    postId: current.postId || null,
    type: current.type || null,
  };
}

function failedResult(error) {
  return {
    status: "failed",
    code: error.code || "unknown",
    message: error instanceof HttpsError ? error.message : "Erreur Meta inconnue.",
  };
}

async function recordPlatformStatus(ref, platform, status) {
  await ref.update({
    [`platformStatus.${platform}`]: {
      ...status,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function graphPost(path, params) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  });

  const response = await fetch(`${getGraphBase()}${path}`, {
    method: "POST",
    body,
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    logger.error("Meta Graph error", {
      path,
      code: data.error?.code || null,
      type: data.error?.type || null,
      traceId: data.error?.fbtrace_id || null,
    });
    throw new HttpsError("failed-precondition", "Erreur Meta Graph API.", {
      code: data.error?.code || "meta_error",
    });
  }
  return data;
}

async function graphGet(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  });

  const response = await fetch(`${getGraphBase()}${path}?${query.toString()}`);
  const data = await response.json();
  if (!response.ok || data.error) {
    logger.error("Meta Graph error", {
      path,
      code: data.error?.code || null,
      type: data.error?.type || null,
      traceId: data.error?.fbtrace_id || null,
    });
    throw new HttpsError("failed-precondition", "Erreur Meta Graph API.", {
      code: data.error?.code || "meta_error",
    });
  }
  return data;
}

async function publishInstagram(publication, token, igUserId) {
  const caption = publication.caption || publication.excerpt || publication.title || "";
  const images = publication.socialImages?.length
    ? publication.socialImages.map((item) => item.url)
    : [publication.image].filter(Boolean);
  const publishKind = publication.format?.publishKind || "feed";

  if (!images.length) {
    throw new HttpsError("failed-precondition", "Aucune image publique disponible pour Instagram.");
  }

  if (publishKind === "reel") {
    throw new HttpsError(
      "failed-precondition",
      "Le format Reel est bien exporte en 1080x1920, mais l'API Reels demande une video_url MP4. Publie ce visuel en Story ou ajoute une etape video."
    );
  }

  if (publishKind === "story") {
    const container = await graphPost(`/${igUserId}/media`, {
      media_type: "STORIES",
      image_url: images[0],
      access_token: token,
    });
    const published = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: token,
    });
    return { status: "published", mediaId: published.id, containerId: container.id, type: "story" };
  }

  if (images.length > 1) {
    const childContainers = [];
    for (const imageUrl of images) {
      const child = await graphPost(`/${igUserId}/media`, {
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: token,
      });
      childContainers.push(child.id);
    }

    const carousel = await graphPost(`/${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: childContainers,
      caption,
      access_token: token,
    });
    const published = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: carousel.id,
      access_token: token,
    });
    return {
      status: "published",
      mediaId: published.id,
      containerId: carousel.id,
      children: childContainers,
      type: "carousel",
    };
  }

  const container = await graphPost(`/${igUserId}/media`, {
    image_url: images[0],
    caption,
    access_token: token,
  });
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  });
  return { status: "published", mediaId: published.id, containerId: container.id, type: "feed" };
}

async function publishFacebook(publication, token, pageId) {
  const caption = publication.caption || publication.excerpt || publication.title || "";
  const imageUrl = publication.socialImages?.[0]?.url || publication.image;
  if (!imageUrl) {
    throw new HttpsError("failed-precondition", "Aucune image publique disponible pour Facebook.");
  }

  const result = await graphPost(`/${pageId}/photos`, {
    url: imageUrl,
    caption,
    published: true,
    access_token: token,
  });
  return { status: "published", mediaId: result.id, postId: result.post_id || null, type: "photo" };
}

function validateMetaTargets(value) {
  if (value == null) {
    return { instagram: true, facebook: true };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "targets invalide.");
  }
  const targets = {
    instagram: value.instagram !== false,
    facebook: value.facebook !== false,
  };
  if (!targets.instagram && !targets.facebook) {
    throw new HttpsError("invalid-argument", "Selectionne au moins une plateforme Meta.");
  }
  return targets;
}

async function acquireMetaLock(ref, ownerUid = null) {
  const now = Date.now();
  let publication;
  await admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Publication introuvable.");
    }
    const data = snapshot.data();
    if (ownerUid && data.ownerUid !== ownerUid) {
      throw new HttpsError("permission-denied", "Cette publication n'appartient pas a l'utilisateur connecte.");
    }
    const lockUntil = data.metaSync?.lockUntil?.toMillis?.() || 0;
    if (data.metaSync?.status === "running" && lockUntil > now) {
      throw new HttpsError("resource-exhausted", "Synchronisation Meta deja en cours.");
    }
    publication = { id: snapshot.id, ...data };
    tx.update(ref, {
      metaSync: {
        status: "running",
        lockUntil: admin.firestore.Timestamp.fromMillis(now + 10 * 60 * 1000),
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  return publication;
}

async function releaseMetaLock(ref, status) {
  await ref.update({
    metaSync: {
      status,
      lockUntil: admin.firestore.Timestamp.fromMillis(0),
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function reserveMetaOAuthState(stateRef) {
  let stateData;
  await admin.firestore().runTransaction(async (tx) => {
    const stateSnapshot = await tx.get(stateRef);
    stateData = stateSnapshot.data();
    if (!stateSnapshot.exists || stateData.status !== "pending") {
      throw new HttpsError("failed-precondition", "state_not_pending");
    }
    if (!stateData.uid) {
      tx.set(stateRef, {
        status: "failed",
        error: "missing_uid",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      throw new HttpsError("failed-precondition", "missing_uid");
    }
    if ((stateData.expiresAt?.toMillis?.() || 0) < Date.now()) {
      tx.set(stateRef, {
        status: "expired",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      throw new HttpsError("deadline-exceeded", "state_expired");
    }
    tx.set(stateRef, {
      status: "processing",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return stateData;
}

function requirePublicationId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new HttpsError("invalid-argument", "publicationId invalide.");
  }
  return value;
}

async function publishPublicationWithCredentials({ publicationId, targets, force, token, igUserId, pageId, source, connectionId, ownerUid = null }) {
  const ref = admin.firestore().collection("publications").doc(publicationId);
  const publication = await acquireMetaLock(ref, ownerUid);
  const platformStatus = { ...(publication.platformStatus || {}) };
  const results = {};
  const withSource = (result) => ({
    ...result,
    source,
    ...(connectionId ? { connectionId } : {}),
  });

  try {
    if (targets.instagram) {
      if (!igUserId) throw new HttpsError("failed-precondition", source === "oauth" ? "Connexion OAuth Instagram incomplete." : "Secret META_IG_USER_ID manquant.");
      try {
        if (!force && isAlreadyPublished(platformStatus, "instagram")) {
          results.instagram = skippedResult(platformStatus, "instagram");
        } else {
          results.instagram = withSource(await publishInstagram(publication, token, igUserId));
          platformStatus.instagram = results.instagram;
          await recordPlatformStatus(ref, "instagram", results.instagram);
        }
      } catch (error) {
        results.instagram = withSource(failedResult(error));
        await recordPlatformStatus(ref, "instagram", results.instagram);
      }
    }

    if (targets.facebook) {
      if (!pageId) throw new HttpsError("failed-precondition", source === "oauth" ? "Connexion OAuth Facebook incomplete." : "Secret META_FACEBOOK_PAGE_ID manquant.");
      try {
        if (!force && isAlreadyPublished(platformStatus, "facebook")) {
          results.facebook = skippedResult(platformStatus, "facebook");
        } else {
          results.facebook = withSource(await publishFacebook(publication, token, pageId));
          platformStatus.facebook = results.facebook;
          await recordPlatformStatus(ref, "facebook", results.facebook);
        }
      } catch (error) {
        results.facebook = withSource(failedResult(error));
        await recordPlatformStatus(ref, "facebook", results.facebook);
      }
    }

    await ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const failures = Object.values(results).filter((result) => result.status === "failed");
    if (failures.length) {
      await releaseMetaLock(ref, "failed");
      throw new HttpsError("failed-precondition", "Synchronisation Meta partielle ou echouee.", results);
    }

    await releaseMetaLock(ref, "done");
    return results;
  } catch (error) {
    await releaseMetaLock(ref, "failed").catch((lockError) => logger.warn("Meta lock release failed", lockError));
    throw error;
  }
}

exports.publishPublicationToMeta = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_META_APP_CHECK,
    secrets: [META_ACCESS_TOKEN, META_IG_USER_ID, META_FACEBOOK_PAGE_ID],
  },
  async (request) => {
    await assertAdmin(request);

    const publicationId = requirePublicationId(request.data?.publicationId);
    const targets = validateMetaTargets(request.data?.targets);
    const force = request.data?.force === true;
    if (request.data?.force != null && typeof request.data.force !== "boolean") {
      throw new HttpsError("invalid-argument", "force invalide.");
    }

    const token = getSecretValue(META_ACCESS_TOKEN);
    const igUserId = getSecretValue(META_IG_USER_ID);
    const pageId = getSecretValue(META_FACEBOOK_PAGE_ID);
    if (!token) {
      throw new HttpsError("failed-precondition", "Secret META_ACCESS_TOKEN manquant.");
    }

    return publishPublicationWithCredentials({
      publicationId,
      targets,
      force,
      token,
      igUserId,
      pageId,
      source: "manual",
    });
  }
);

exports.getMetaOAuthStatus = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_META_APP_CHECK,
  },
  async (request) => {
    const uid = assertAuthenticated(request);
    const snapshot = await metaConnectionRef(uid).get();
    if (!snapshot.exists) {
      return publicMetaConnection();
    }
    return publicMetaConnection(snapshot.data());
  }
);

exports.createMetaOAuthConnectUrl = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_META_APP_CHECK,
    secrets: [META_APP_ID, META_OAUTH_REDIRECT_URI],
  },
  async (request) => {
    const uid = assertAuthenticated(request);
    const appId = getSecretValue(META_APP_ID);
    const redirectUri = getSecretValue(META_OAUTH_REDIRECT_URI);
    if (!appId || !redirectUri) {
      throw new HttpsError("failed-precondition", "Secrets META_APP_ID ou META_OAUTH_REDIRECT_URI manquants.");
    }

    const state = crypto.randomBytes(32).toString("hex");
    const stateId = crypto.createHash("sha256").update(state).digest("hex");
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
    await admin.firestore().collection("meta_oauth_states").doc(stateId).set({
      status: "pending",
      uid,
      email: request.auth?.token?.email || "",
      connectionId: META_CONNECTION_ID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    const url = new URL(`${getFacebookDialogBase()}/dialog/oauth`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", META_OAUTH_SCOPES.join(","));
    url.searchParams.set("response_type", "code");
    return {
      url: url.toString(),
      expiresAt: expiresAt.toMillis(),
      scopes: META_OAUTH_SCOPES,
    };
  }
);

exports.disconnectMetaOAuth = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_META_APP_CHECK,
  },
  async (request) => {
    const uid = assertAuthenticated(request);
    await metaConnectionRef(uid).set({
      status: "disconnected",
      ownerUid: uid,
      encryptedPageAccessToken: admin.firestore.FieldValue.delete(),
      pageId: admin.firestore.FieldValue.delete(),
      pageName: admin.firestore.FieldValue.delete(),
      igUserId: admin.firestore.FieldValue.delete(),
      igUsername: admin.firestore.FieldValue.delete(),
      scopes: admin.firestore.FieldValue.delete(),
      tokenExpiresAt: admin.firestore.FieldValue.delete(),
      connectedAt: admin.firestore.FieldValue.delete(),
      connectedBy: admin.firestore.FieldValue.delete(),
      connectedUid: admin.firestore.FieldValue.delete(),
      source: admin.firestore.FieldValue.delete(),
      lastError: "",
      disconnectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      disconnectedBy: request.auth?.token?.email || "",
    }, { merge: true });
    return { status: "disconnected" };
  }
);

exports.publishPublicationToConnectedMeta = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_META_APP_CHECK,
    secrets: [META_TOKEN_ENCRYPTION_KEY],
  },
  async (request) => {
    const uid = assertAuthenticated(request);
    const publicationId = requirePublicationId(request.data?.publicationId);
    const targets = validateMetaTargets(request.data?.targets);
    const force = request.data?.force === true;
    if (request.data?.force != null && typeof request.data.force !== "boolean") {
      throw new HttpsError("invalid-argument", "force invalide.");
    }

    const snapshot = await metaConnectionRef(uid).get();
    if (!snapshot.exists || snapshot.data()?.status !== "connected") {
      throw new HttpsError("failed-precondition", "Aucune connexion Meta OAuth active.");
    }

    const connection = snapshot.data();
    if (isExpiredTimestamp(connection.tokenExpiresAt)) {
      await metaConnectionRef(uid).set({
        status: "expired",
        lastError: "Token Meta expire. Reconnecte OAuth Meta avant de publier.",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      throw new HttpsError("failed-precondition", "Token Meta expire. Reconnecte OAuth Meta avant de publier.");
    }

    const token = decryptMetaToken(connection.encryptedPageAccessToken);
    return publishPublicationWithCredentials({
      publicationId,
      targets,
      force,
      token,
      igUserId: connection.igUserId,
      pageId: connection.pageId,
      source: "oauth",
      connectionId: META_CONNECTION_ID,
      ownerUid: uid,
    });
  }
);

exports.metaOAuthCallback = onRequest(
  {
    region: REGION,
    secrets: [META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI, META_TOKEN_ENCRYPTION_KEY],
  },
  async (request, response) => {
    response.set("Content-Type", "text/html; charset=utf-8");
    const finish = (title, body, ok = false) => response.status(ok ? 200 : 400).send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${htmlEscape(title)}</title><style>body{font-family:Inter,Arial,sans-serif;background:#111710;color:#f4f1e8;display:grid;min-height:100vh;place-items:center;margin:0}.card{max-width:620px;padding:34px;border:1px solid rgba(158,211,106,.25);border-radius:22px;background:#182015}h1{margin:0 0 12px;font-size:28px}p{line-height:1.6;color:#d8e8cb}.ok{color:#9ed36a}.bad{color:#ff9b8d}button{border:0;border-radius:999px;background:#9ed36a;color:#10140f;padding:12px 18px;font-weight:800;cursor:pointer}</style></head><body><main class="card"><h1 class="${ok ? "ok" : "bad"}">${htmlEscape(title)}</h1><p>${htmlEscape(body)}</p><button onclick="window.close()">Fermer cette fenetre</button><script>setTimeout(()=>{try{window.close()}catch(e){}},2200)</script></main></body></html>`);
    let callbackStateRef = null;

    try {
      if (request.method !== "GET") {
        return finish("Methode refusee", "La callback OAuth Meta doit etre appelee en GET.");
      }
      const error = request.query.error_description || request.query.error;
      if (error) {
        return finish("Connexion annulee", String(error));
      }
      const code = String(request.query.code || "");
      const state = String(request.query.state || "");
      if (!code || !state) {
        return finish("Callback incomplete", "Meta n'a pas renvoye le code OAuth ou le state.");
      }

      const stateId = crypto.createHash("sha256").update(state).digest("hex");
      const stateRef = admin.firestore().collection("meta_oauth_states").doc(stateId);
      callbackStateRef = stateRef;
      let stateData;
      try {
        stateData = await reserveMetaOAuthState(stateRef);
      } catch (stateError) {
        if (stateError.message === "missing_uid") {
          return finish("State invalide", "Cette demande OAuth n'est rattachee a aucun utilisateur.");
        }
        if (stateError.message === "state_expired") {
          return finish("State expire", "Relance la connexion depuis le backoffice.");
        }
        return finish("State invalide", "Cette demande de connexion est introuvable ou deja utilisee.");
      }

      const appId = getSecretValue(META_APP_ID);
      const appSecret = getSecretValue(META_APP_SECRET);
      const redirectUri = getSecretValue(META_OAUTH_REDIRECT_URI);
      if (!appId || !appSecret || !redirectUri) {
        throw new HttpsError("failed-precondition", "Secrets META_APP_ID, META_APP_SECRET ou META_OAUTH_REDIRECT_URI manquants.");
      }
      const shortToken = await graphGet("/oauth/access_token", {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      });
      const longToken = await graphGet("/oauth/access_token", {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken.access_token,
      });
      const userToken = longToken.access_token || shortToken.access_token;
      const accounts = await graphGet("/me/accounts", {
        fields: "id,name,access_token,tasks",
        access_token: userToken,
      });
      const page = Array.isArray(accounts.data) ? accounts.data.find((item) => item.access_token) : null;
      if (!page) {
        await stateRef.set({ status: "failed", error: "no_page", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return finish("Aucune Page trouvee", "Le compte Facebook connecte ne semble administrer aucune Page accessible par l'app.");
      }

      const pageDetails = await graphGet(`/${page.id}`, {
        fields: "instagram_business_account{id,username}",
        access_token: page.access_token,
      });
      const instagram = pageDetails.instagram_business_account;
      if (!instagram?.id) {
        await stateRef.set({ status: "failed", error: "no_instagram_business_account", pageId: page.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return finish("Instagram non relie", "La Page trouvee n'a pas d'Instagram professionnel relie. Relie Instagram a la Page puis recommence.");
      }

      const tokenExpiresAt = longToken.expires_in
        ? admin.firestore.Timestamp.fromMillis(Date.now() + Number(longToken.expires_in) * 1000)
        : null;
      await metaConnectionRef(stateData.uid).set({
        status: "connected",
        provider: "meta",
        ownerUid: stateData.uid,
        connectionId: META_CONNECTION_ID,
        pageId: String(page.id),
        pageName: String(page.name || ""),
        igUserId: String(instagram.id),
        igUsername: String(instagram.username || ""),
        scopes: META_OAUTH_SCOPES,
        encryptedPageAccessToken: encryptMetaToken(page.access_token),
        tokenExpiresAt,
        connectedBy: stateData.email || "",
        connectedUid: stateData.uid || "",
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "oauth",
        lastError: "",
      });
      await stateRef.set({
        status: "done",
        pageId: String(page.id),
        igUserId: String(instagram.id),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return finish("Connexion Meta reussie", `Page ${page.name || page.id} connectee avec Instagram @${instagram.username || instagram.id}. Tu peux revenir au backoffice.`, true);
    } catch (error) {
      if (callbackStateRef) {
        await callbackStateRef.set({
          status: "failed",
          error: error.code || "callback_error",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }).catch((stateError) => logger.warn("Meta OAuth state failure update failed", stateError));
      }
      logger.error("Meta OAuth callback failed", {
        code: error.code || null,
        message: error.message || null,
      });
      return finish("Connexion Meta echouee", error.message || "Erreur inconnue pendant la callback OAuth Meta.");
    }
  }
);
