import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Startup } from "./mockData";
import type { ClaimSpotEntry } from "./claimSpotsMockData";
import type { MockListingBidRecord } from "./mockBiddingTypes";
import type {
  MarketplaceInterestRecord,
  MarketplaceListing,
} from "./mockMarketplaceService";
import type { AuthUser } from "./mockAuthService";

const DB_NAME = "ownerr-web-app";
const DB_VERSION = 7;
const USER_STARTUP_STORE = "user-startups";
const CLAIM_SPOTS_STORE = "claim-spots";
const MOCK_LISTING_BIDS_STORE = "mock-listing-bids";
const MARKETPLACE_LISTINGS_STORE = "marketplace-listings";
const MARKETPLACE_INTEREST_STORE = "marketplace-interest";
const AUTH_USERS_STORE = "auth-users";

interface OwnerrDB extends DBSchema {
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
  "marketplace-listings": {
    key: string;
    value: MarketplaceListing;
    indexes: { "by-owner": string };
  };
  "marketplace-interest": {
    key: string;
    value: MarketplaceInterestRecord;
    indexes: { "by-listing": string; "by-buyer": string };
  };
  "auth-users": {
    key: string;
    value: AuthUser;
    indexes: { "by-email": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OwnerrDB>> | null = null; 

function getDB(): Promise<IDBPDatabase<OwnerrDB>> { 
  if (!dbPromise) {
    dbPromise = openDB<OwnerrDB>(DB_NAME, DB_VERSION, {
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
        if (!db.objectStoreNames.contains(MARKETPLACE_LISTINGS_STORE)) {
          const store = db.createObjectStore(MARKETPLACE_LISTINGS_STORE, { keyPath: "slug" });
          store.createIndex("by-owner", "ownerUserId", { unique: false });
        }
        if (!db.objectStoreNames.contains(MARKETPLACE_INTEREST_STORE)) {
          const store = db.createObjectStore(MARKETPLACE_INTEREST_STORE, { keyPath: "id" });
          store.createIndex("by-listing", "listingId", { unique: false });
          store.createIndex("by-buyer", "buyerUserId", { unique: false });
        }
        if (!db.objectStoreNames.contains(AUTH_USERS_STORE)) {
          const store = db.createObjectStore(AUTH_USERS_STORE, { keyPath: "id" });
          store.createIndex("by-email", "email", { unique: true });
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

export async function getMarketplaceListingsDB(): Promise<MarketplaceListing[]> {
  const db = await getDB();
  return db.getAll(MARKETPLACE_LISTINGS_STORE);
}

export async function getMarketplaceListingDB(slug: string): Promise<MarketplaceListing | undefined> {
  const db = await getDB();
  return db.get(MARKETPLACE_LISTINGS_STORE, slug);
}

export async function putMarketplaceListingDB(listing: MarketplaceListing): Promise<void> {
  const db = await getDB();
  await db.put(MARKETPLACE_LISTINGS_STORE, listing);
}

export async function addMarketplaceInterestDB(record: MarketplaceInterestRecord): Promise<void> {
  const db = await getDB();
  await db.put(MARKETPLACE_INTEREST_STORE, record);
}

export async function getMarketplaceInterestRecordsByListingDB(
  listingId: string,
): Promise<MarketplaceInterestRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex(MARKETPLACE_INTEREST_STORE, "by-listing", listingId);
}

export async function getMarketplaceInterestRecordsDB(): Promise<MarketplaceInterestRecord[]> {
  const db = await getDB();
  return db.getAll(MARKETPLACE_INTEREST_STORE);
}

export async function getMarketplaceInterestRecordsByBuyerDB(
  buyerUserId: string,
): Promise<MarketplaceInterestRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex(MARKETPLACE_INTEREST_STORE, "by-buyer", buyerUserId);
}

export async function putMarketplaceInterestDB(record: MarketplaceInterestRecord): Promise<void> {
  const db = await getDB();
  await db.put(MARKETPLACE_INTEREST_STORE, record);
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
