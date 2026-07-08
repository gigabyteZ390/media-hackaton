// MongoDB connection + a tiny TTL cache, used to speed up the fact-check (Axis 2)
// and spare the API quotas (KOSIS is capped, the LLM/web-search calls cost money).
//
// Everything here is OPTIONAL and best-effort: if MONGODB_URI is unset or the DB
// is unreachable, every function degrades to a no-op / null and the app keeps
// working (same philosophy as the stats API keys). Cache is a bonus, never a
// dependency.

import { MongoClient, type Db } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? "media_hackaton";

// Cache the connection promise across dev HMR reloads to avoid connection storms.
const g = globalThis as unknown as {
  __mongoClientPromise?: Promise<MongoClient>;
  __mongoIndexesReady?: boolean;
};

function clientPromise(): Promise<MongoClient> | null {
  if (!URI) return null;
  if (!g.__mongoClientPromise) {
    const client = new MongoClient(URI, {
      serverSelectionTimeoutMS: 3000, // fail fast if the NAS/Tailscale is down
    });
    g.__mongoClientPromise = client.connect();
  }
  return g.__mongoClientPromise;
}

/** Get the app DB, or null if Mongo is not configured/reachable. */
export async function getDb(): Promise<Db | null> {
  const p = clientPromise();
  if (!p) return null;
  try {
    const client = await p;
    const db = client.db(DB_NAME);
    await ensureIndexes(db);
    return db;
  } catch {
    return null;
  }
}

/** Create the TTL indexes once so expired cache docs are auto-removed. */
async function ensureIndexes(db: Db): Promise<void> {
  if (g.__mongoIndexesReady) return;
  g.__mongoIndexesReady = true; // set first so failures don't retry every call
  try {
    await Promise.all(
      ["statCache", "factCache"].map((c) =>
        db.collection(c).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      )
    );
  } catch {
    /* index creation is best-effort */
  }
}

/** Read a cached value by key (null on miss, expiry, or any error). */
export async function cacheGet<T>(collection: string, key: string): Promise<T | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const doc = await db.collection(collection).findOne({ _id: key as any });
    if (!doc) return null;
    // Guard even if the TTL sweep hasn't run yet.
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) return null;
    return doc.value as T;
  } catch {
    return null;
  }
}

/** Upsert a value with a TTL (seconds). Best-effort — ignores write errors. */
export async function cacheSet<T>(
  collection: string,
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.collection(collection).updateOne(
      { _id: key as any },
      {
        $set: {
          value,
          expiresAt: new Date(Date.now() + ttlSeconds * 1000),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch {
    /* cache write failures must never break the request */
  }
}
