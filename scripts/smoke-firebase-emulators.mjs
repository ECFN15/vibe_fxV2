import assert from "node:assert/strict";

import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setLogLevel,
  setDoc,
  terminate,
  updateDoc,
  where,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";

import {
  DEFAULT_TEXT,
  buildChecker,
  buildPublicationData,
} from "../src/features/publications/helpers/publicationHelpers.js";

const projectId = process.env.FIREBASE_EMULATOR_PROJECT_ID || "demo-vibefx";
const stamp = Date.now();
const stepTimeoutMs = 15_000;

setLogLevel("silent");

function createClient(name) {
  const app = initializeApp(
    {
      apiKey: "demo-key",
      authDomain: `${projectId}.localhost`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:demo",
    },
    name
  );
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  return { app, auth, db, storage };
}

async function closeClient(client) {
  await terminate(client.db);
  await deleteApp(client.app);
}

async function withStep(label, action) {
  console.log(`emulator smoke: ${label}`);

  let timeout;
  try {
    return await Promise.race([
      action(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${stepTimeoutMs}ms`)), stepTimeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function expectPermissionDenied(action, label, acceptedCodes = ["permission-denied"]) {
  try {
    await action();
    assert.fail(`${label} should be denied`);
  } catch (error) {
    assert.ok(
      acceptedCodes.includes(error.code),
      `${label}: expected ${acceptedCodes.join(" or ")}, got ${error.code}`
    );
  }
}

const owner = createClient("owner");
const stranger = createClient("stranger");

try {
  const [ownerCredential, strangerCredential] = await withStep("creating anonymous auth users", () =>
    Promise.all([
      signInAnonymously(owner.auth),
      signInAnonymously(stranger.auth),
    ])
  );
  const ownerUid = ownerCredential.user.uid;
  const strangerUid = strangerCredential.user.uid;

  const publicationId = `pub-${stamp}`;
  const publicationRef = doc(owner.db, "publications", publicationId);
  const ownerUserRef = doc(owner.db, "users", ownerUid);
  const publicationDraft = {
    format: {
      id: "portrait",
      label: "Instagram portrait",
      width: 1080,
      height: 1350,
      publishKind: "feed",
      supportsReel: false,
    },
    template: { id: "standard", label: "Standard" },
    layoutDraft: {
      source: "vibefx",
      textLayers: [DEFAULT_TEXT],
      settings: { fixture: true },
    },
  };
  const publicationPayload = {
    imageUrl: `https://storage.example/users/${ownerUid}/publications/${publicationId}/cover.jpg`,
    socialImages: [
      {
        url: `https://storage.example/users/${ownerUid}/publications/${publicationId}/cover.jpg`,
        width: 1080,
        height: 1350,
        index: 0,
      },
    ],
  };
  const publicationChecker = buildChecker({
    caption: "Publication emulateur #vibefx",
    format: publicationDraft.format,
    exportSize: 500_000,
    textLayers: publicationDraft.layoutDraft.textLayers,
  });

  await withStep("checking user plan create denial", () =>
    expectPermissionDenied(
      () =>
        setDoc(ownerUserRef, {
          email: "",
          displayName: "Owner",
          plan: "enterprise",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      "client cannot create own user profile with plan"
    )
  );

  await withStep("creating owner user profile", () =>
    setDoc(ownerUserRef, {
      email: "",
      displayName: "Owner",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  );

  await withStep("checking owner user profile update", () =>
    updateDoc(ownerUserRef, {
      displayName: "Owner updated",
      updatedAt: new Date().toISOString(),
    })
  );

  await withStep("checking user plan update denial", () =>
    expectPermissionDenied(
      () => updateDoc(ownerUserRef, { plan: "enterprise" }),
      "client cannot update plan on user profile"
    )
  );

  await withStep("checking user role update denial", () =>
    expectPermissionDenied(
      () => updateDoc(ownerUserRef, { role: "admin" }),
      "client cannot update role on user profile"
    )
  );

  await withStep("checking stranger user profile read denial", () =>
    expectPermissionDenied(
      () => getDoc(doc(stranger.db, "users", ownerUid)),
      "stranger cannot read owner user profile"
    )
  );

  await withStep("creating owner publication", () =>
    setDoc(publicationRef, {
      ...buildPublicationData({
        publication: null,
        title: "Emulator publication",
        excerpt: "Draft saved through emulator smoke.",
        content: "Publication content",
        caption: "Publication emulateur #vibefx",
        tags: "emulator, vibefx",
        featured: false,
        status: "draft",
        payload: publicationPayload,
        initialFormat: publicationDraft.format,
        publishKind: "feed",
        draft: publicationDraft,
        checker: publicationChecker,
        uid: ownerUid,
      }),
      createdAt: new Date().toISOString(),
    })
  );

  const ownerSnapshot = await withStep("reading owner publication", () => getDoc(publicationRef));
  assert.equal(ownerSnapshot.exists(), true);
  assert.equal(ownerSnapshot.data().ownerUid, ownerUid);

  const ownerQuery = await withStep("querying owner publications", () =>
    getDocs(query(collection(owner.db, "publications"), where("ownerUid", "==", ownerUid)))
  );
  assert.equal(ownerQuery.size, 1);

  await withStep("checking Firestore create denial", () =>
    expectPermissionDenied(
      () =>
        setDoc(doc(stranger.db, "publications", `bad-${stamp}`), {
          ownerUid,
          title: "Bad owner",
          status: "draft",
        }),
      "stranger cannot create publication for owner"
    )
  );

  await withStep("checking Firestore fake platform status create denial", () =>
    expectPermissionDenied(
      () =>
        setDoc(doc(owner.db, "publications", `fake-status-${stamp}`), {
          ownerUid,
          title: "Fake status",
          status: "draft",
          platformStatus: {
            instagram: { status: "published", mediaId: "fake" },
          },
        }),
      "client cannot create publication with platformStatus"
    )
  );

  await withStep("checking Firestore stranger update denial", () =>
    expectPermissionDenied(
      () => updateDoc(doc(stranger.db, "publications", publicationId), { title: "Stolen" }),
      "stranger cannot update owner publication"
    )
  );

  await withStep("checking Firestore draft read denial", () =>
    expectPermissionDenied(
      () => getDoc(doc(stranger.db, "publications", publicationId)),
      "stranger cannot read owner draft publication"
    )
  );

  await withStep("checking Firestore owner transfer denial", () =>
    expectPermissionDenied(
      () => updateDoc(publicationRef, { ownerUid: strangerUid }),
      "owner cannot transfer ownerUid"
    )
  );

  await withStep("checking Firestore platform status update denial", () =>
    expectPermissionDenied(
      () => updateDoc(publicationRef, { platformStatus: { instagram: { status: "published", mediaId: "fake" } } }),
      "client cannot update platformStatus"
    )
  );

  await withStep("checking Firestore meta sync update denial", () =>
    expectPermissionDenied(
      () => updateDoc(publicationRef, { metaSync: { status: "running" } }),
      "client cannot update metaSync"
    )
  );

  await withStep("checking Firestore published read", async () => {
    await updateDoc(publicationRef, buildPublicationData({
      publication: {
        id: publicationId,
        ownerUid,
        publishedAt: null,
        platformStatus: {},
        template: publicationDraft.template,
        layoutDraft: publicationDraft.layoutDraft,
      },
      title: "Emulator publication",
      excerpt: "Published through emulator smoke.",
      content: "Publication content",
      caption: "Publication emulateur #vibefx",
      tags: "emulator, vibefx",
      featured: false,
      status: "published",
      payload: publicationPayload,
      initialFormat: publicationDraft.format,
      publishKind: "feed",
      draft: publicationDraft,
      checker: publicationChecker,
      uid: ownerUid,
    }));
    const publishedSnapshot = await getDoc(doc(stranger.db, "publications", publicationId));
    assert.equal(publishedSnapshot.exists(), true);
    assert.equal(publishedSnapshot.data().status, "published");
  });

  await withStep("checking technical collection denial", () =>
    expectPermissionDenied(
      () => setDoc(doc(owner.db, "meta_connections", ownerUid), { ownerUid }),
      "client cannot write meta_connections"
    )
  );

  await withStep("checking owner Storage upload", () =>
    uploadBytes(
      ref(owner.storage, `users/${ownerUid}/publications/${publicationId}/cover.jpg`),
      new Blob(["image"], { type: "image/jpeg" }),
      { contentType: "image/jpeg" }
    )
  );

  await withStep("checking public Storage object get", async () => {
    const url = await getDownloadURL(ref(stranger.storage, `users/${ownerUid}/publications/${publicationId}/cover.jpg`));
    assert.match(url, /cover\.jpg/);
  });

  await withStep("checking Storage list denial", () =>
    expectPermissionDenied(
      () => listAll(ref(stranger.storage, `users/${ownerUid}/publications/${publicationId}`)),
      "publication media directories cannot be listed",
      ["storage/unauthorized"]
    )
  );

  await withStep("checking Storage stranger path denial", () =>
    expectPermissionDenied(
      () =>
        uploadBytes(
          ref(stranger.storage, `users/${ownerUid}/publications/${publicationId}/bad.jpg`),
          new Blob(["image"], { type: "image/jpeg" }),
          { contentType: "image/jpeg" }
        ),
      "stranger cannot upload into owner publication path",
      ["storage/unauthorized"]
    )
  );

  await withStep("checking Storage content type denial", () =>
    expectPermissionDenied(
      () =>
        uploadBytes(
          ref(owner.storage, `users/${ownerUid}/publications/${publicationId}/bad.txt`),
          new Blob(["not an image"], { type: "text/plain" }),
          { contentType: "text/plain" }
        ),
      "non-image upload is not writable",
      ["storage/unauthorized"]
    )
  );

  await withStep("checking Storage size denial", () =>
    expectPermissionDenied(
      () =>
        uploadBytes(
          ref(owner.storage, `users/${ownerUid}/publications/${publicationId}/too-large.jpg`),
          new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: "image/jpeg" }),
          { contentType: "image/jpeg" }
        ),
      "oversized image upload is not writable",
      ["storage/unauthorized"]
    )
  );

  await withStep("checking legacy Storage path denial", () =>
    expectPermissionDenied(
      () =>
        uploadBytes(
          ref(owner.storage, `publications/${publicationId}/legacy.jpg`),
          new Blob(["image"], { type: "image/jpeg" }),
          { contentType: "image/jpeg" }
        ),
      "legacy publication path is not writable",
      ["storage/unauthorized"]
    )
  );

  console.log("firebase emulator smoke test OK");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([closeClient(owner), closeClient(stranger)]);
}

process.exit(process.exitCode || 0);
