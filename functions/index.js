const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const META_ACCESS_TOKEN = defineSecret("META_ACCESS_TOKEN");
const META_IG_USER_ID = defineSecret("META_IG_USER_ID");
const META_FACEBOOK_PAGE_ID = defineSecret("META_FACEBOOK_PAGE_ID");
const META_APP_ID = defineSecret("META_APP_ID");
const META_APP_SECRET = defineSecret("META_APP_SECRET");
const META_OAUTH_REDIRECT_URI = defineSecret("META_OAUTH_REDIRECT_URI");
const META_TOKEN_ENCRYPTION_KEY = defineSecret("META_TOKEN_ENCRYPTION_KEY");

const ADMIN_EMAIL = "matthis.fradin2@gmail.com";
const REGION = "europe-west9";
const ENFORCE_META_APP_CHECK = process.env.ENFORCE_META_APP_CHECK === "true";
const ENFORCE_PUBLIC_QUOTE_APP_CHECK = process.env.ENFORCE_PUBLIC_QUOTE_APP_CHECK === "true";
const ENFORCE_PUBLIC_ORDER_APP_CHECK = process.env.ENFORCE_PUBLIC_ORDER_APP_CHECK === "true";
const MAX_REQUEST_TEXT = 5000;
const MAX_SHORT_TEXT = 240;
const META_CONNECTION_ID = "default";
const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];

const QUOTE_SERVICES = new Map([
  ["creation-jardin", "Creation de jardin"],
  ["entretien", "Entretien de jardin"],
  ["tonte-pelouse", "Tonte de pelouse"],
  ["taille-haies", "Taille de haies et arbustes"],
  ["potager", "Creation de potager et vergers"],
  ["elagage", "Elagage et abattage"],
  ["terrasses", "Terrasses et allees"],
  ["phytoepuration", "Phytoepuration et bassins"],
  ["clotures", "Clotures et brise-vues"],
  ["autre", "Autre projet"],
]);

const PICKUP_DEFAULT_CAPACITY = 8;
const PICKUP_LOCATION = "Le Hameau Hue, 61100 Flers";
const DELIVERY_LOCATION = "Flers et alentours";
const MAX_ROUTINE_OCCURRENCES = 60;

const ROUTINE_DISCOUNT_RATES = {
  weekly: 0.15,
  biweekly: 0.1,
  monthly: 0.075,
};

const SLOT_MODE_LABELS = {
  pickup: "Retrait au Hameau Hue",
  local_delivery: "Livraison locale",
};

const LEGACY_FULFILLMENT_SLOTS = new Map([
  ["jeudi-15", { mode: "pickup", type: "Retrait au Hameau Hue", day: "Jeudi", date: "30/05", time: "15h00 - 15h30", location: PICKUP_LOCATION, capacity: PICKUP_DEFAULT_CAPACITY }],
  ["jeudi-16", { mode: "pickup", type: "Retrait au Hameau Hue", day: "Jeudi", date: "30/05", time: "16h00 - 16h30", location: PICKUP_LOCATION, capacity: PICKUP_DEFAULT_CAPACITY }],
  ["vendredi-17", { mode: "pickup", type: "Retrait au Hameau Hue", day: "Vendredi", date: "31/05", time: "17h00 - 17h30", location: PICKUP_LOCATION, capacity: PICKUP_DEFAULT_CAPACITY }],
  ["vendredi-18", { mode: "pickup", type: "Retrait au Hameau Hue", day: "Vendredi", date: "31/05", time: "18h00 - 18h30", location: PICKUP_LOCATION, capacity: PICKUP_DEFAULT_CAPACITY }],
  ["flers", { mode: "local_delivery", type: "Livraison locale", day: "Livraison Flers", date: "Selon tournee", time: "Dans la journee", location: DELIVERY_LOCATION, capacity: 6 }],
]);

const STATIC_PRODUCTS = new Map([
  ["tomate-noire-de-crimee", { title: "Tomate 'Noire de Crimee'", category: "Plants potagers", price: 3.2, image: "/assets/pages/marche/product-01-tomate-noire-crimee.jpg" }],
  ["basilic-genovese", { title: "Basilic Genovese", category: "Plantes aromatiques", price: 2.2, image: "/assets/pages/marche/product-02-basilic-genovese.jpg" }],
  ["courgette-verte", { title: "Courgette Verte non coureuse", category: "Plants potagers", price: 2.8, image: "/assets/pages/marche/product-03-courgette-verte.jpg" }],
  ["laitue-batavia", { title: "Laitue Batavia", category: "Plants potagers", price: 2.1, image: "/assets/pages/marche/product-04-laitue-batavia.jpg" }],
  ["lavande-vraie", { title: "Lavande vraie", category: "Fleurs comestibles", price: 8.9, image: "/assets/pages/marche/product-05-lavande-vraie.jpg" }],
  ["erable-japon", { title: "Erable du Japon", category: "Arbustes", price: 34.9, image: "/assets/pages/marche/product-06-erable-japon.jpg" }],
  ["paillage-miscanthus", { title: "Paillage de miscanthus", category: "Paillage", price: 12.9, image: "/assets/pages/marche/product-07-paillage-miscanthus.jpg" }],
  ["engrais-organique", { title: "Engrais organique universel", category: "Substrats & terreaux", price: 15.9, image: "/assets/pages/marche/product-08-engrais-organique.jpg" }],
]);

async function assertAdmin(request) {
  const email = request.auth?.token?.email?.toLowerCase();
  const hasVerifiedAdminEmail =
    email === ADMIN_EMAIL;
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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function requireText(value, field, min = 1, max = MAX_SHORT_TEXT) {
  const text = String(value || "").trim();
  if (text.length < min || text.length > max) {
    throw new HttpsError("invalid-argument", `${field} invalide.`);
  }
  return text;
}

function optionalText(value, max = MAX_SHORT_TEXT) {
  const text = String(value || "").trim();
  if (text.length > max) {
    throw new HttpsError("invalid-argument", "Champ trop long.");
  }
  return text;
}

function requireEmail(value) {
  const email = normalizeEmail(value);
  if (email.length < 5 || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Adresse e-mail invalide.");
  }
  return email;
}

function requirePhone(value) {
  return requireText(value, "Telephone", 6, 30);
}

function requestIp(request) {
  return String(
    request.rawRequest?.headers?.["fastly-client-ip"] ||
    request.rawRequest?.headers?.["x-forwarded-for"] ||
    request.rawRequest?.ip ||
    "unknown"
  ).split(",")[0].trim();
}

function hashKey(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 32);
}

function makePublicNumber(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function slotIdFor(date, startTime, mode = "pickup") {
  return `${mode}-${date}-${String(startTime || "journee").replace(":", "")}`;
}

function formatSlotDay(dateKey, mode = "pickup") {
  const date = parseDateKey(dateKey);
  if (!date) {
    return mode === "local_delivery" ? "Livraison Flers" : "Retrait";
  }
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date);
  const cleanDay = `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
  return mode === "local_delivery" ? `Livraison ${cleanDay}` : cleanDay;
}

function formatSlotDate(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return "Date a confirmer";
  }
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatSlotTime(startTime, endTime, mode = "pickup") {
  if (mode === "local_delivery") {
    return "Dans la journee";
  }
  return `${String(startTime || "").replace(":", "h")} - ${String(endTime || "").replace(":", "h")}`;
}

function normalizeSlot(data, id) {
  const mode = data?.mode === "local_delivery" ? "local_delivery" : "pickup";
  const date = String(data?.date || data?.dateKey || "").trim();
  const parsed = parseDateKey(date);
  if (!parsed) {
    return null;
  }
  const startTime = String(data?.startTime || (mode === "local_delivery" ? "10:00" : "15:00")).trim();
  const endTime = String(data?.endTime || (mode === "local_delivery" ? "18:00" : "15:30")).trim();
  const capacity = Math.max(1, Math.min(200, Number(data?.capacity) || PICKUP_DEFAULT_CAPACITY));
  const reservedCount = Math.max(0, Number(data?.reservedCount) || 0);
  const status = data?.status === "closed" || data?.closed === true ? "closed" : "open";

  return {
    id: id || slotIdFor(date, startTime, mode),
    date,
    dateKey: date,
    mode,
    startTime,
    endTime,
    day: data?.day || formatSlotDay(date, mode),
    displayDate: data?.displayDate || formatSlotDate(date),
    time: data?.time || formatSlotTime(startTime, endTime, mode),
    type: data?.type || SLOT_MODE_LABELS[mode],
    location: data?.location || (mode === "local_delivery" ? DELIVERY_LOCATION : PICKUP_LOCATION),
    capacity,
    reservedCount,
    active: data?.active !== false,
    status,
    note: optionalText(data?.note || "", 1000),
  };
}

function buildGeneratedSlot(date, startTime, endTime, mode = "pickup", capacity = PICKUP_DEFAULT_CAPACITY) {
  return normalizeSlot({
    date,
    startTime,
    endTime,
    mode,
    capacity,
    active: true,
    status: "open",
  }, slotIdFor(date, startTime, mode));
}

function buildGeneratedSlots(origin = new Date(), monthsAhead = 12) {
  const start = new Date(origin);
  start.setHours(0, 0, 0, 0);
  const end = addMonths(start, monthsAhead);
  const slots = new Map();

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const weekday = cursor.getDay();
    const date = toDateKey(cursor);
    const daySlots = [];
    if (weekday === 4) {
      daySlots.push(
        buildGeneratedSlot(date, "15:00", "15:30"),
        buildGeneratedSlot(date, "16:00", "16:30")
      );
    }
    if (weekday === 5) {
      daySlots.push(
        buildGeneratedSlot(date, "17:00", "17:30"),
        buildGeneratedSlot(date, "18:00", "18:30")
      );
    }
    daySlots.filter(Boolean).forEach((slot) => slots.set(slot.id, slot));
  }

  LEGACY_FULFILLMENT_SLOTS.forEach((slot, id) => {
    slots.set(id, { id, ...slot, active: true, status: "open" });
  });

  return slots;
}

function getRoutineDates(startDateKey, frequency, untilDateKey) {
  const start = parseDateKey(startDateKey);
  const until = parseDateKey(untilDateKey);
  if (!start || !until || until <= start) {
    return [];
  }
  const maxUntil = addMonths(start, 12);
  const cappedUntil = until > maxUntil ? maxUntil : until;
  const dates = [];
  let cursor = new Date(start);

  while (dates.length < MAX_ROUTINE_OCCURRENCES) {
    if (frequency === "weekly") {
      cursor = addDays(cursor, 7);
    } else if (frequency === "biweekly") {
      cursor = addDays(cursor, 14);
    } else if (frequency === "monthly") {
      cursor = addMonths(cursor, 1);
    } else {
      break;
    }
    if (cursor > cappedUntil) {
      break;
    }
    dates.push(toDateKey(cursor));
  }

  return dates;
}

async function consumeRateLimit(kind, identity, limit, windowMs) {
  const now = Date.now();
  const ref = admin.firestore().collection("rate_limits").doc(`${kind}_${hashKey(identity)}`);
  await admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const current = snapshot.exists ? snapshot.data() : {};
    const windowStart = current.windowStart?.toMillis?.() || 0;
    const expired = now - windowStart > windowMs;
    const nextCount = expired ? 1 : Number(current.count || 0) + 1;
    if (nextCount > limit) {
      throw new HttpsError("resource-exhausted", "Trop de tentatives. Reessayez plus tard.");
    }
    tx.set(ref, {
      kind,
      count: nextCount,
      windowStart: admin.firestore.Timestamp.fromMillis(expired ? now : windowStart),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

function assertVerifiedEmailMatches(request, emailLower) {
  const tokenEmail = normalizeEmail(request.auth?.token?.email);
  return Boolean(
    request.auth?.uid &&
    request.auth?.token?.email_verified === true &&
    tokenEmail === emailLower
  );
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
  return {
    instagram: value.instagram !== false,
    facebook: value.facebook !== false,
  };
}

async function acquireMetaLock(ref) {
  const now = Date.now();
  let publication;
  await admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Publication introuvable.");
    }
    const data = snapshot.data();
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

function requirePublicationId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new HttpsError("invalid-argument", "publicationId invalide.");
  }
  return value;
}

async function publishPublicationWithCredentials({ publicationId, targets, force, token, igUserId, pageId, source, connectionId }) {
  const ref = admin.firestore().collection("publications").doc(publicationId);
  const publication = await acquireMetaLock(ref);
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

async function resolveProduct(productId) {
  const snapshot = await admin.firestore().collection("products").doc(productId).get();
  if (snapshot.exists) {
    const data = snapshot.data();
    if (data.active === false) {
      throw new HttpsError("failed-precondition", "Produit indisponible.");
    }
    return {
      id: snapshot.id,
      title: requireText(data.title, "Produit", 1, 160),
      category: requireText(data.category || "Plants potagers", "Categorie", 1, 120),
      price: Number(data.price),
      image: optionalText(data.image || "", 1000),
    };
  }

  const fallback = STATIC_PRODUCTS.get(productId);
  if (!fallback) {
    throw new HttpsError("not-found", "Produit introuvable.");
  }
  return { id: productId, ...fallback };
}

exports.createQuoteRequest = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_PUBLIC_QUOTE_APP_CHECK,
  },
  async (request) => {
    const payload = request.data || {};
    const customer = payload.customer || {};
    const project = payload.project || {};
    const emailLower = requireEmail(customer.email);
    const fullName = requireText(customer.fullName, "Nom", 2, 120);
    const phone = requirePhone(customer.phone);
    const services = Array.isArray(project.services) ? project.services : [];
    const cleanServices = [...new Set(services.map((item) => String(item || "").trim()))]
      .filter((item) => QUOTE_SERVICES.has(item));

    if (!cleanServices.length || cleanServices.length > 12) {
      throw new HttpsError("invalid-argument", "Services invalides.");
    }

    await consumeRateLimit("quote", `${requestIp(request)}:${emailLower}`, 5, 60 * 60 * 1000);

    const requestNumber = makePublicNumber("DEV");
    const data = {
      requestNumber,
      source: "public_devis_page",
      status: "new",
      customerEmailLower: emailLower,
      customer: {
        fullName,
        email: emailLower,
        phone,
      },
      project: {
        services: cleanServices,
        serviceLabels: cleanServices.map((id) => QUOTE_SERVICES.get(id)),
        description: requireText(project.description, "Description", 10, MAX_REQUEST_TEXT),
        surface: optionalText(project.surface, 80),
        address: requireText(project.address, "Adresse", 6, MAX_SHORT_TEXT),
        budget: optionalText(project.budget, 80),
        timing: optionalText(project.timing, 80),
        referral: optionalText(project.referral, 120),
      },
      attachments: [],
      consent: payload.consent === true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.consent !== true) {
      throw new HttpsError("invalid-argument", "Consentement requis.");
    }

    const ref = await admin.firestore().collection("quote_requests").add(data);
    return { id: ref.id, requestNumber };
  }
);

exports.createOrder = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_PUBLIC_ORDER_APP_CHECK,
  },
  async (request) => {
    const payload = request.data || {};
    const customer = payload.customer || {};
    const emailLower = requireEmail(customer.email);
    const slotId = requireText(payload.fulfillment?.slotId, "Creneau", 2, 160);
    const inputItems = Array.isArray(payload.items) ? payload.items : [];

    if (!inputItems.length || inputItems.length > 50) {
      throw new HttpsError("invalid-argument", "Panier invalide.");
    }

    await consumeRateLimit("order", `${requestIp(request)}:${emailLower}`, 10, 60 * 60 * 1000);

    const items = [];
    for (const inputItem of inputItems) {
      const productId = requireText(inputItem.productId || inputItem.id, "Produit", 1, 160);
      const qty = Number(inputItem.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
        throw new HttpsError("invalid-argument", "Quantite invalide.");
      }
      const product = await resolveProduct(productId);
      if (!Number.isFinite(product.price) || product.price < 0 || product.price > 5000) {
        throw new HttpsError("failed-precondition", "Prix produit invalide.");
      }
      const price = Number(product.price.toFixed(2));
      items.push({
        productId: product.id,
        title: product.title,
        category: product.category,
        price,
        qty,
        image: product.image || "",
        lineTotal: Number((price * qty).toFixed(2)),
      });
    }

    const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
    if (itemCount > 500) {
      throw new HttpsError("invalid-argument", "Panier trop volumineux.");
    }

    const subtotalAmount = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const db = admin.firestore();
    const requestedSlotSnapshot = await db.collection("pickup_slots").doc(slotId).get();
    if (!requestedSlotSnapshot.exists) {
      throw new HttpsError("invalid-argument", "Ce creneau n'est plus publie dans le calendrier.");
    }
    const requestedSlot = normalizeSlot(requestedSlotSnapshot.data(), requestedSlotSnapshot.id);
    if (!requestedSlot) {
      throw new HttpsError("invalid-argument", "Creneau invalide.");
    }
    if (!requestedSlot.active || requestedSlot.status === "closed") {
      throw new HttpsError("failed-precondition", "Ce creneau n'est plus disponible.");
    }

    const routinePayload = payload.routine || {};
    const routineFrequency = ["weekly", "biweekly", "monthly"].includes(routinePayload.frequency)
      ? routinePayload.frequency
      : "once";
    const routineDates = routinePayload.enabled === true
      ? getRoutineDates(requestedSlot.date, routineFrequency, routinePayload.untilDate)
      : [];
    const routineSlots = routineDates.map((date) =>
      buildGeneratedSlot(
        date,
        requestedSlot.startTime,
        requestedSlot.endTime,
        requestedSlot.mode,
        requestedSlot.capacity
      )
    ).filter(Boolean);

    const slotsToReserve = [requestedSlot, ...routineSlots];
    if (slotsToReserve.length > MAX_ROUTINE_OCCURRENCES + 1) {
      throw new HttpsError("invalid-argument", "Routine trop longue.");
    }
    const routineDiscountRate = routineSlots.length ? ROUTINE_DISCOUNT_RATES[routineFrequency] || 0 : 0;
    const discountAmount = Number((subtotalAmount * routineDiscountRate).toFixed(2));
    const totalAmount = Number(Math.max(0, subtotalAmount - discountAmount).toFixed(2));

    const attachVerifiedUser = assertVerifiedEmailMatches(request, emailLower);
    const firstName = optionalText(customer.firstName, 80);
    const lastName = optionalText(customer.lastName, 80);
    const customerName = requireText(customer.name || `${firstName} ${lastName}`, "Nom", 2, 120);
    const phone = requirePhone(customer.phone);
    const note = optionalText(payload.fulfillment?.note, 1000);
    const routineInfo = routineSlots.length
      ? {
          enabled: true,
          frequency: routineFrequency,
          untilDate: routinePayload.untilDate,
          occurrenceCount: slotsToReserve.length,
          parentSlotId: requestedSlot.id,
          discountRate: routineDiscountRate,
        }
      : { enabled: false };

    const orderRefs = slotsToReserve.map(() => db.collection("orders").doc());
    const slotRefs = slotsToReserve.map((slot) => db.collection("pickup_slots").doc(slot.id));
    const orderNumbers = slotsToReserve.map(() => makePublicNumber("CMD"));

    await db.runTransaction(async (tx) => {
      const txSlots = [];
      for (let index = 0; index < slotsToReserve.length; index += 1) {
        const slotRef = slotRefs[index];
        const slotSnapshot = await tx.get(slotRef);
        if (!slotSnapshot.exists) {
          throw new HttpsError("failed-precondition", "Un creneau de la routine n'est plus publie.");
        }
        const slot = normalizeSlot(slotSnapshot.data(), slotSnapshot.id);
        if (!slot) {
          throw new HttpsError("invalid-argument", "Creneau invalide.");
        }
        if (!slot.active || slot.status === "closed") {
          throw new HttpsError("failed-precondition", "Un creneau de la routine n'est plus disponible.");
        }
        const reservedCount = Math.max(0, Number(slotSnapshot.data().reservedCount) || 0);
        if (reservedCount >= slot.capacity) {
          throw new HttpsError("resource-exhausted", "Un creneau est complet. Choisissez un autre horaire.");
        }
        txSlots.push({ ...slot, reservedCount });
      }

      txSlots.forEach((slot, index) => {
        tx.set(orderRefs[index], {
          orderNumber: orderNumbers[index],
          source: "marketplace",
          status: "new",
          customerEmailLower: emailLower,
          userId: attachVerifiedUser ? request.auth.uid : null,
          customer: {
            name: customerName,
            firstName,
            lastName,
            email: emailLower,
            phone,
          },
          fulfillment: {
            mode: slot.mode,
            type: slot.type,
            slotId: slot.id,
            slotRef: `pickup_slots/${slot.id}`,
            dateKey: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotLabel: `${slot.day} ${slot.displayDate || slot.date} - ${slot.time}`,
            location: slot.location,
            note,
          },
          routine: {
            ...routineInfo,
            isOccurrence: index > 0,
            sequence: index + 1,
          },
          items,
          itemCount,
          subtotalAmount,
          discount: {
            rate: routineDiscountRate,
            amount: discountAmount,
            label: routineDiscountRate ? `Remise routine ${Math.round(routineDiscountRate * 1000) / 10}%` : "",
          },
          totalAmount,
          currency: "EUR",
          payment: {
            method: "on_pickup",
            label: "Paiement au retrait",
            onlinePaid: false,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        tx.set(slotRefs[index], {
          ...slot,
          reservedCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });
    });

    return {
      id: orderRefs[0].id,
      orderNumber: orderNumbers[0],
      orderCount: slotsToReserve.length,
      subtotalAmount,
      discountAmount,
      totalAmount,
    };
  }
);

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

    const token = META_ACCESS_TOKEN.value();
    const igUserId = META_IG_USER_ID.value();
    const pageId = META_FACEBOOK_PAGE_ID.value();
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
    await assertAdmin(request);
    const snapshot = await admin.firestore().collection("meta_connections").doc(META_CONNECTION_ID).get();
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
    await assertAdmin(request);
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
      uid: request.auth?.uid || "",
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
    await assertAdmin(request);
    await admin.firestore().collection("meta_connections").doc(META_CONNECTION_ID).set({
      status: "disconnected",
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
    await assertAdmin(request);
    const publicationId = requirePublicationId(request.data?.publicationId);
    const targets = validateMetaTargets(request.data?.targets);
    const force = request.data?.force === true;
    if (request.data?.force != null && typeof request.data.force !== "boolean") {
      throw new HttpsError("invalid-argument", "force invalide.");
    }

    const snapshot = await admin.firestore().collection("meta_connections").doc(META_CONNECTION_ID).get();
    if (!snapshot.exists || snapshot.data()?.status !== "connected") {
      throw new HttpsError("failed-precondition", "Aucune connexion Meta OAuth active.");
    }

    const connection = snapshot.data();
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
    const finish = (title, body, ok = false) => response.status(ok ? 200 : 400).send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${htmlEscape(title)}</title><style>body{font-family:Inter,Arial,sans-serif;background:#111710;color:#f4f1e8;display:grid;min-height:100vh;place-items:center;margin:0}.card{max-width:620px;padding:34px;border:1px solid rgba(158,211,106,.25);border-radius:22px;background:#182015}h1{margin:0 0 12px;font-size:28px}p{line-height:1.6;color:#d8e8cb}.ok{color:#9ed36a}.bad{color:#ff9b8d}button{border:0;border-radius:999px;background:#9ed36a;color:#10140f;padding:12px 18px;font-weight:800;cursor:pointer}</style></head><body><main class="card"><h1 class="${ok ? "ok" : "bad"}">${htmlEscape(title)}</h1><p>${htmlEscape(body)}</p><button onclick="window.close()">Fermer cette fenêtre</button><script>setTimeout(()=>{try{window.close()}catch(e){}},2200)</script></main></body></html>`);

    try {
      if (request.method !== "GET") {
        return finish("Méthode refusée", "La callback OAuth Meta doit être appelée en GET.");
      }
      const error = request.query.error_description || request.query.error;
      if (error) {
        return finish("Connexion annulée", String(error));
      }
      const code = String(request.query.code || "");
      const state = String(request.query.state || "");
      if (!code || !state) {
        return finish("Callback incomplète", "Meta n'a pas renvoyé le code OAuth ou le state.");
      }

      const stateId = crypto.createHash("sha256").update(state).digest("hex");
      const stateRef = admin.firestore().collection("meta_oauth_states").doc(stateId);
      const stateSnapshot = await stateRef.get();
      const stateData = stateSnapshot.data();
      if (!stateSnapshot.exists || stateData.status !== "pending") {
        return finish("State invalide", "Cette demande de connexion est introuvable ou déjà utilisée.");
      }
      if ((stateData.expiresAt?.toMillis?.() || 0) < Date.now()) {
        await stateRef.set({ status: "expired", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return finish("State expiré", "Relance la connexion depuis le backoffice.");
      }

      const appId = getSecretValue(META_APP_ID);
      const appSecret = getSecretValue(META_APP_SECRET);
      const redirectUri = getSecretValue(META_OAUTH_REDIRECT_URI);
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
        return finish("Aucune Page trouvée", "Le compte Facebook connecté ne semble administrer aucune Page accessible par l'app.");
      }

      const pageDetails = await graphGet(`/${page.id}`, {
        fields: "instagram_business_account{id,username}",
        access_token: page.access_token,
      });
      const instagram = pageDetails.instagram_business_account;
      if (!instagram?.id) {
        await stateRef.set({ status: "failed", error: "no_instagram_business_account", pageId: page.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return finish("Instagram non relié", "La Page trouvée n'a pas d'Instagram professionnel relié. Relie Instagram à la Page puis recommence.");
      }

      const tokenExpiresAt = longToken.expires_in
        ? admin.firestore.Timestamp.fromMillis(Date.now() + Number(longToken.expires_in) * 1000)
        : null;
      await admin.firestore().collection("meta_connections").doc(META_CONNECTION_ID).set({
        status: "connected",
        provider: "meta",
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
      return finish("Connexion Meta réussie", `Page ${page.name || page.id} connectée avec Instagram @${instagram.username || instagram.id}. Tu peux revenir au backoffice.`, true);
    } catch (error) {
      logger.error("Meta OAuth callback failed", {
        code: error.code || null,
        message: error.message || null,
      });
      return finish("Connexion Meta échouée", error.message || "Erreur inconnue pendant la callback OAuth Meta.");
    }
  }
);
