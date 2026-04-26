import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Startup } from "./mockData";
import type { ClaimSpotEntry } from "./claimSpotsMockData";
import type { MockListingBidRecord } from "./mockBiddingTypes";

const DB_NAME = "ownerr-web-app";
const DB_VERSION = 4;
const USER_STARTUP_STORE = "user-startups";
const CLAIM_SPOTS_STORE = "claim-spots";
const MOCK_LISTING_BIDS_STORE = "mock-listing-bids";

interface TrustmrrDB extends DBSchema {
  "user-startups": {
    key: string;
    value: Startup;
    indexes: { "by-slug": string };
  };
  "claim-spots": {
    key: string;
    value: ClaimSpotEntry;
  };
  "mock-listing-bids": {
    key: string;
    value: MockListingBidRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<TrustmrrDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TrustmrrDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TrustmrrDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(USER_STARTUP_STORE)) {
          const store = db.createObjectStore(USER_STARTUP_STORE, { keyPath: "slug" });
          store.createIndex("by-slug", "slug", { unique: true });
        }
        if (!db.objectStoreNames.contains(CLAIM_SPOTS_STORE)) {
          db.createObjectStore(CLAIM_SPOTS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(MOCK_LISTING_BIDS_STORE)) {
          db.createObjectStore(MOCK_LISTING_BIDS_STORE, { keyPath: "listingId" });
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

export async function addClaimSpotEntryDB(entry: ClaimSpotEntry): Promise<void> {
  const db = await getDB();
  await db.put(CLAIM_SPOTS_STORE, entry);
}

export async function getClaimSpotEntriesDB(): Promise<ClaimSpotEntry[]> {
  const db = await getDB();
  return db.getAll(CLAIM_SPOTS_STORE);
}

export async function getMockListingBidRecordDB(listingId: string): Promise<MockListingBidRecord | undefined> {
  const db = await getDB();
  return db.get(MOCK_LISTING_BIDS_STORE, listingId);
}

export async function getAllMockListingBidRecordsDB(): Promise<MockListingBidRecord[]> {
  const db = await getDB();
  return db.getAll(MOCK_LISTING_BIDS_STORE);
}

export async function putMockListingBidRecordDB(record: MockListingBidRecord): Promise<void> {
  const db = await getDB();
  await db.put(MOCK_LISTING_BIDS_STORE, record);
}
