import {
  getAuthUserByEmailDB,
  getAuthUserByIdDB,
  getAuthUsersDB,
  putAuthUserDB,
} from "@/lib/db";

export type AuthRole = "buyer" | "founder";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AuthRole;
  avatarSeed?: string;
  createdAt: string;
};

const DEFAULT_PASSWORD = "demo123";

const PRIMARY_USERS: AuthUser[] = [
  {
    id: "buyer-olivia",
    name: "Olivia Carter",
    email: "olivia@ownerr.io",
    password: DEFAULT_PASSWORD,
    role: "buyer",
    avatarSeed: "olivia-carter-buyer",
    createdAt: new Date("2026-01-10").toISOString(),
  },
  {
    id: "alicew",
    name: "Alice Wang",
    email: "alice@ownerr.io",
    password: DEFAULT_PASSWORD,
    role: "founder",
    avatarSeed: "alice-wang-founder",
    createdAt: new Date("2026-01-12").toISOString(),
  },
];

export const MOCK_AUTH_LOGIN_ACCOUNTS = PRIMARY_USERS.map((user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  password: user.password,
  role: user.role,
  avatarSeed: user.avatarSeed ?? user.id,
}));

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function ensureSeedAuthUsers(): Promise<AuthUser[]> {
  const existing = await getAuthUsersDB();
  const existingById = new Map(existing.map((user) => [user.id, user] as const));

  // Keep previously created accounts, but always ensure primary buyer/founder
  // accounts are available and up to date for quick sign-in.
  await Promise.all(
    PRIMARY_USERS.map(async (seed) => {
      const prior = existingById.get(seed.id);
      const merged: AuthUser = prior
        ? {
            ...prior,
            name: seed.name,
            email: seed.email,
            password: seed.password,
            role: seed.role,
            avatarSeed: seed.avatarSeed,
          }
        : seed;
      await putAuthUserDB(merged);
    }),
  );
  return getAuthUsersDB();
}

export async function listAuthUsers(): Promise<AuthUser[]> {
  const users = await ensureSeedAuthUsers();
  return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAuthUserById(id: string): Promise<AuthUser | null> {
  await ensureSeedAuthUsers();
  return (await getAuthUserByIdDB(id)) ?? null;
}

export async function loginAuthUser(email: string, password: string): Promise<AuthUser> {
  await ensureSeedAuthUsers();
  const normalized = normalizeEmail(email);
  const user = await getAuthUserByEmailDB(normalized);
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }
  return user;
}

export async function registerAuthUser(input: {
  name: string;
  email: string;
  password: string;
  role: AuthRole;
}): Promise<AuthUser> {
  await ensureSeedAuthUsers();
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password.trim();

  if (name.length < 2) throw new Error("Enter a valid name.");
  if (!email.includes("@")) throw new Error("Enter a valid email.");
  if (password.length < 4) throw new Error("Password must be at least 4 characters.");

  const existing = await getAuthUserByEmailDB(email);
  if (existing) throw new Error("An account with that email already exists.");

  const user: AuthUser = {
    id: `user-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
    name,
    email,
    password,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  await putAuthUserDB(user);
  return user;
}

export const MOCK_AUTH_DEMO_PASSWORD = DEFAULT_PASSWORD;
