import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Startup } from "./mockData";
import type { AuthUser } from "@/lib/auth/types";
import type { FounderSubmissionRecord } from "./founderTypes";

const DB_NAME = "ownerr-web-app";
const DB_VERSION = 10;
const VALUATION_SESSION_STORE = "valuation-session";
const USER_STARTUP_STORE = "user-startups";
const AUTH_USERS_STORE = "auth-users";
const FOUNDER_SUBMISSIONS_STORE = "founder-submissions";

interface OwnerrDB extends DBSchema {
  "user-startups": {
    key: string;
    value: Startup;
    indexes: { "by-slug": string };
  };
  "auth-users": {
    key: string;
    value: AuthUser;
    indexes: { "by-email": string };
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
          const store = db.createObjectStore(USER_STARTUP_STORE, { keyPath: "slug" });
          store.createIndex("by-slug", "slug", { unique: true });
        }
        if (!db.objectStoreNames.contains(AUTH_USERS_STORE)) {
          const store = db.createObjectStore(AUTH_USERS_STORE, { keyPath: "id" });
          store.createIndex("by-email", "email", { unique: true });
        }
        if (!db.objectStoreNames.contains(VALUATION_SESSION_STORE)) {
          db.createObjectStore(VALUATION_SESSION_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(FOUNDER_SUBMISSIONS_STORE)) {
          const store = db.createObjectStore(FOUNDER_SUBMISSIONS_STORE, { keyPath: "id" });
          store.createIndex("by-referral-code", "referralCode", { unique: true });
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

export async function getAuthUsersDB(): Promise<AuthUser[]> {
  const db = await getDB();
  return db.getAll(AUTH_USERS_STORE);
}

export async function getAuthUserByIdDB(id: string): Promise<AuthUser | undefined> {
  const db = await getDB();
  return db.get(AUTH_USERS_STORE, id);
}

export async function getAuthUserByEmailDB(email: string): Promise<AuthUser | undefined> {
  const db = await getDB();
  return db.getFromIndex(AUTH_USERS_STORE, "by-email", email);
}

export async function putAuthUserDB(user: AuthUser): Promise<void> {
  const db = await getDB();
  await db.put(AUTH_USERS_STORE, user);
}

export async function putFounderSubmissionDB(record: FounderSubmissionRecord): Promise<void> {
  const db = await getDB();
  await db.put(FOUNDER_SUBMISSIONS_STORE, record);
}

export async function getFounderSubmissionDB(id: string): Promise<FounderSubmissionRecord | undefined> {
  const db = await getDB();
  return db.get(FOUNDER_SUBMISSIONS_STORE, id);
}

export async function getFounderByReferralCodeDB(
  code: string,
): Promise<FounderSubmissionRecord | undefined> {
  const db = await getDB();
  return db.getFromIndex(FOUNDER_SUBMISSIONS_STORE, "by-referral-code", code);
}

export async function getAllFounderSubmissionsDB(): Promise<FounderSubmissionRecord[]> {
  const db = await getDB();
  return db.getAll(FOUNDER_SUBMISSIONS_STORE);
}
