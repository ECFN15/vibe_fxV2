import assert from "node:assert/strict";

import {
  buildChecker,
  buildPublicationData,
  normalizeVibeFxDraft,
  resolvePublicationAssets,
} from "../src/features/publications/helpers/publicationHelpers.js";

const sampleBlob = new Blob(["image"], { type: "image/jpeg" });

const draft = normalizeVibeFxDraft({
  dataUrl: "data:image/jpeg;base64,abc",
  blob: sampleBlob,
  width: 1080,
  height: 1350,
  format: { id: "insta-port", w: 1080, h: 1350, ratio: 4 / 5 },
  template: { id: "standard", label: "Standard", slots: 1 },
  settings: {
    texts: [{ id: "title", content: "Launch", x: 0.5, y: 0.5, size: 42 }],
    slotConfigs: { 0: { zoom: 1.2, x: 0, y: 0 } },
  },
});

assert.equal(draft.format.id, "portrait");
assert.equal(draft.format.width, 1080);
assert.equal(draft.layoutDraft.source, "vibefx");
assert.equal(draft.layoutDraft.textLayers[0].x, 50);
assert.equal(draft.socialImages.length, 1);

const checker = buildChecker({
  caption: "Nouvelle publication #social #instagram #facebook",
  format: draft.format,
  exportSize: 500_000,
  textLayers: draft.layoutDraft.textLayers,
});

assert.equal(checker.issues.length, 0);
assert.equal(checker.hashtags, 3);
assert.ok(checker.score > 0);

const uploadedPaths = [];
const fakeStorage = {};
const payload = await resolvePublicationAssets({
  storage: fakeStorage,
  draft,
  publication: null,
  format: draft.format,
  socialImages: draft.socialImages,
  publicationId: "pub_123",
  uid: "user_123",
  now: () => "fixture",
  uploadBlob: async (_storage, blob, path) => {
    assert.equal(_storage, fakeStorage);
    assert.equal(blob.type, "image/jpeg");
    uploadedPaths.push(path);
    return `https://storage.example/${path}`;
  },
});

assert.deepEqual(uploadedPaths, [
  "users/user_123/publications/pub_123/fixture-cover.jpg",
  "users/user_123/publications/pub_123/fixture-slide-1.jpg",
]);
assert.equal(payload.imageUrl, "https://storage.example/users/user_123/publications/pub_123/fixture-cover.jpg");
assert.equal(payload.socialImages[0].width, 1080);

const data = buildPublicationData({
  publication: null,
  title: "Ma publication",
  excerpt: "Resume",
  content: "Contenu",
  caption: "Nouvelle publication #social #instagram #facebook",
  tags: "social, instagram",
  featured: false,
  status: "draft",
  payload,
  initialFormat: draft.format,
  publishKind: draft.format.publishKind,
  draft,
  checker,
  uid: "user_123",
});

assert.equal(data.ownerUid, "user_123");
assert.equal(data.slug, "ma-publication");
assert.equal(data.status, "draft");
assert.equal(data.socialImages[0].index, 0);
assert.equal(data.layoutDraft.source, "vibefx");

console.log("publication flow smoke test OK");
