import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Startup } from "./mockData";
import type { FounderSubmissionRecord } from "./founderTypes";

const DB_NAME = "ownerr-web-app";
const DB_VERSION = 11;
const VALUATION_SESSION_STORE = "valuation-session";
const USER_STARTUP_STORE = "user-startups";
const FOUNDER_SUBMISSIONS_STORE = "founder-submissions";

interface OwnerrDB extends DBSchema {
  "user-startups": {
    key: string;
    value: Startup;
    indexes: { "by-slug": string };
  };
  "valuation-session": {
    key: string;
    value: {
      id: string;
      phase: string;
      questionIndex: number;
      inputs: Record<string, unknown>;
      meta: Record<string, unknown>;
      updatedAt: number;
    };
  };
  "founder-submissions": {
    key: string;
    value: FounderSubmissionRecord;
    indexes: { "by-referral-code": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OwnerrDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<OwnerrDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OwnerrDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(USER_STARTUP_STORE)) {
          const store = db.createObjectStore(USER_STARTUP_STORE, {
            keyPath: "slug",
          });
          store.createIndex("by-slug", "slug", { unique: true });
        }
        if (!db.objectStoreNames.contains(VALUATION_SESSION_STORE)) {
          db.createObjectStore(VALUATION_SESSION_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(FOUNDER_SUBMISSIONS_STORE)) {
          const store = db.createObjectStore(FOUNDER_SUBMISSIONS_STORE, {
            keyPath: "id",
          });
          store.createIndex("by-referral-code", "referralCode", {
            unique: true,
          });
        }
        if (oldVersion < 10) {
          const legacyStores = new Set([
            "claim-spots",
            "mock-listing-bids",
            "marketplace-listings",
            "marketplace-interest",
          ]);
          for (let i = 0; i < db.objectStoreNames.length; i++) {
            const name = db.objectStoreNames.item(i);
            if (name && legacyStores.has(name)) {
              db.deleteObjectStore(name);
            }
          }
        }
        if (oldVersion < 11) {
          const names = db.objectStoreNames;
          for (let i = 0; i < names.length; i++) {
            const name = names[i] as string;
            if (name === "auth-users") {
              (
                db as unknown as { deleteObjectStore(n: string): void }
              ).deleteObjectStore(name);
            }
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function addUserStartupDB(startup: Startup): Promise<void> {
  const db = await getDB();
  await db.put(USER_STARTUP_STORE, startup);
}

export async function getUserStartupsDB(): Promise<Startup[]> {
  const db = await getDB();
  return db.getAll(USER_STARTUP_STORE);
}

export async function putFounderSubmissionDB(
  record: FounderSubmissionRecord,
): Promise<void> {
  const db = await getDB();
  await db.put(FOUNDER_SUBMISSIONS_STORE, record);
}

export async function getFounderSubmissionDB(
  id: string,
): Promise<FounderSubmissionRecord | undefined> {
  const db = await getDB();
  return db.get(FOUNDER_SUBMISSIONS_STORE, id);
}

export async function getFounderByReferralCodeDB(
  code: string,
): Promise<FounderSubmissionRecord | undefined> {
  const db = await getDB();
  return db.getFromIndex(FOUNDER_SUBMISSIONS_STORE, "by-referral-code", code);
}

export async function getAllFounderSubmissionsDB(): Promise<
  FounderSubmissionRecord[]
> {
  const db = await getDB();
  return db.getAll(FOUNDER_SUBMISSIONS_STORE);
}
