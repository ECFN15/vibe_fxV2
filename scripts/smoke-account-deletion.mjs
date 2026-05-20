import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";

class HttpsError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function firestoreStub() {
  throw new Error("firestore_stub_runtime_not_available");
}

firestoreStub.FieldValue = {
  serverTimestamp: () => ({ __type: "serverTimestamp" }),
};

const adminStub = {
  firestore: firestoreStub,
  storage: () => ({ bucket: () => null }),
  auth: () => ({ deleteUser: async () => undefined }),
};

const originalLoad = Module._load;
Module._load = function loadWithAccountStubs(request, parent, isMain) {
  if (request === "firebase-functions/v2/https") {
    return {
      HttpsError,
      onCall: (options, handler) => ({ __callable: true, options, handler }),
    };
  }
  if (request === "firebase-functions/logger") {
    return {
      warn: () => undefined,
      error: () => undefined,
      info: () => undefined,
    };
  }
  if (request === "firebase-admin") {
    return adminStub;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const require = createRequire(import.meta.url);
const {
  deleteAccountData,
  assertRecentAuthentication,
  authTimeMillis,
  deletedUserPatch,
  RECENT_AUTH_MAX_AGE_MS,
} = require("../functions/src/account.js");

class FakeSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = data !== undefined;
    this._data = data;
  }

  data() {
    return this._data;
  }
}

class FakeDocRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split("/").at(-1);
  }
}

class FakeCollectionRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
  }

  doc(id) {
    return new FakeDocRef(this.db, `${this.path}/${id}`);
  }

  where(field, operator, value) {
    assert.equal(operator, "==");
    return new FakeQuery(this.db, this.path, [{ field, value }]);
  }
}

class FakeQuery {
  constructor(db, path, filters = [], max = Infinity) {
    this.db = db;
    this.path = path;
    this.filters = filters;
    this.max = max;
  }

  limit(max) {
    return new FakeQuery(this.db, this.path, this.filters, max);
  }

  async get() {
    const prefix = `${this.path}/`;
    const docs = [...this.db.store.entries()]
      .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
      .filter(([, data]) => this.filters.every((filter) => data?.[filter.field] === filter.value))
      .slice(0, this.max)
      .map(([path, data]) => ({
        id: path.split("/").at(-1),
        ref: new FakeDocRef(this.db, path),
        data: () => data,
      }));
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
    };
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
  }

  set(ref, data, options) {
    this.db.set(ref.path, data, options);
  }
}

class FakeBatch {
  constructor(db) {
    this.db = db;
    this.ops = [];
  }

  set(ref, data, options) {
    this.ops.push({ type: "set", path: ref.path, data, options });
  }

  delete(ref) {
    this.ops.push({ type: "delete", path: ref.path });
  }

  async commit() {
    for (const op of this.ops) {
      if (op.type === "delete") {
        this.db.store.delete(op.path);
      } else {
        this.db.set(op.path, op.data, op.options);
      }
    }
  }
}

class FakeFirestore {
  constructor() {
    this.store = new Map();
  }

  collection(path) {
    return new FakeCollectionRef(this, path);
  }

  batch() {
    return new FakeBatch(this);
  }

  async runTransaction(callback) {
    return callback(new FakeTransaction(this));
  }

  set(path, data, options = {}) {
    const current = this.store.get(path) || {};
    this.store.set(path, options.merge ? { ...current, ...data } : { ...data });
  }

  get(path) {
    return this.store.get(path);
  }
}

class FakeBucket {
  constructor(files = []) {
    this.files = files;
    this.deletedPrefixes = [];
  }

  async getFiles({ prefix }) {
    return [this.files.filter((file) => file.name.startsWith(prefix))];
  }

  async deleteFiles({ prefix }) {
    this.deletedPrefixes.push(prefix);
    this.files = this.files.filter((file) => !file.name.startsWith(prefix));
  }
}

class FakeAuth {
  constructor() {
    this.deleted = [];
  }

  async deleteUser(uid) {
    this.deleted.push(uid);
  }
}

async function testDeleteAccountData() {
  const db = new FakeFirestore();
  const bucket = new FakeBucket([
    { name: "users/u_delete/uploads/images/a.png" },
    { name: "users/u_delete/exports/e.mp4" },
    { name: "users/other/uploads/images/b.png" },
  ]);
  const auth = new FakeAuth();

  db.set("users/u_delete", {
    email: "user@example.com",
    displayName: "User",
    photoURL: "https://example.test/avatar.png",
    creditBalance: 42,
    reservedCreditBalance: 0,
  });
  db.set("publications/pub_delete", { ownerUid: "u_delete", title: "delete me" });
  db.set("publications/pub_keep", { ownerUid: "other", title: "keep me" });
  db.set("aiJobs/job_delete", {
    uid: "u_delete",
    promptOriginal: "secret prompt",
    promptCleaned: "secret prompt",
    output: { text: "secret output" },
  });
  db.set("aiJobs/job_keep", { uid: "other", promptOriginal: "keep" });
  db.set("checkoutSessions/checkout_delete", { uid: "u_delete", email: "user@example.com" });

  const result = await deleteAccountData({
    uid: "u_delete",
    email: "user@example.com",
    db,
    bucket,
    auth,
  });

  assert.equal(result.status, "deleted");
  assert.equal(result.deletedPublications, 1);
  assert.equal(result.scrubbedAiJobs, 1);
  assert.equal(result.scrubbedCheckouts, 1);
  assert.equal(result.storageDeletedFiles, 2);
  assert.deepEqual(auth.deleted, ["u_delete"]);
  assert.deepEqual(bucket.deletedPrefixes, ["users/u_delete/"]);

  const user = db.get("users/u_delete");
  assert.equal(user.email, null);
  assert.equal(user.displayName, "Deleted account");
  assert.equal(user.photoURL, "");
  assert.equal(user.creditBalance, 42);
  assert.equal(user.deletionStatus, "completed");
  assert.equal(db.get("accountDeletionRequests/u_delete").status, "completed");
  assert.equal(db.get("publications/pub_delete"), undefined);
  assert.equal(db.get("publications/pub_keep").title, "keep me");
  assert.equal(db.get("aiJobs/job_delete").promptOriginal, null);
  assert.equal(db.get("aiJobs/job_delete").output, null);
  assert.equal(db.get("aiJobs/job_keep").promptOriginal, "keep");
  assert.equal(db.get("checkoutSessions/checkout_delete").email, null);
  assert.equal(bucket.files.length, 1);
}

function testDeletedUserPatch() {
  const patch = deletedUserPatch({ now: true });
  assert.equal(patch.email, null);
  assert.equal(patch.displayName, "Deleted account");
  assert.equal(patch.deletionStatus, "completed");
}

function testRecentAuthenticationGuard() {
  const nowMs = Date.parse("2026-05-20T12:00:00.000Z");
  const currentAuthTime = Math.floor(nowMs / 1000);
  assert.equal(authTimeMillis({ auth_time: currentAuthTime }), nowMs);
  assert.equal(assertRecentAuthentication({ auth_time: currentAuthTime }, nowMs), true);
  assert.throws(
    () => assertRecentAuthentication({
      auth_time: Math.floor((nowMs - RECENT_AUTH_MAX_AGE_MS - 1000) / 1000),
    }, nowMs),
    (error) => error.code === "failed-precondition" && /Reconnecte-toi/.test(error.message)
  );
  assert.throws(
    () => assertRecentAuthentication({}, nowMs),
    (error) => error.code === "failed-precondition" && /Reconnecte-toi/.test(error.message)
  );
}

await testDeleteAccountData();
testDeletedUserPatch();
testRecentAuthenticationGuard();

console.log("account deletion smoke test OK");
