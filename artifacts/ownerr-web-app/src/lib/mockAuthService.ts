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
    email: "olivia@Ownerr",
    password: DEFAULT_PASSWORD,
    role: "buyer",
    avatarSeed: "olivia-carter-buyer",
    createdAt: new Date("2026-01-10").toISOString(),
  },
  {
    id: "alicew",
    name: "Alice Wang",
    email: "alice@Ownerr",
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

export async function ensureSeedAuthUsers(): Promise<void> {
  // Overwrite primary user accounts to ensure they are always available and up to date.
  // This prevents stale data and ensures demo logins are reliable.
  console.log("[Auth] Seeding primary demo user accounts...");
  await Promise.all(
    PRIMARY_USERS.map(async (seedUser) => {
      const userToStore: AuthUser = {
        ...seedUser,
        email: normalizeEmail(seedUser.email),
      };
      await putAuthUserDB(userToStore);
    }),
  );
  console.log("[Auth] Primary demo user accounts seeded successfully.");
}

export async function listAuthUsers(): Promise<AuthUser[]> {
  await ensureSeedAuthUsers();
  const users = await getAuthUsersDB();
  return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAuthUserById(id: string): Promise<AuthUser | null> {
  await ensureSeedAuthUsers();
  return (await getAuthUserByIdDB(id)) ?? null;
}

export async function loginAuthUser(email: string, password: string): Promise<AuthUser> {
  // Ensure demo users are always available before attempting login.
  await ensureSeedAuthUsers();

  const normalizedEmail = normalizeEmail(email);
  console.log(`[Auth] Login attempt for normalized email: "${normalizedEmail}"`);

  let user = await getAuthUserByEmailDB(normalizedEmail);

  // Fallback: If the user isn't found, re-seed and try one more time.
  // This makes the login extremely robust, even if IndexedDB is cleared.
  if (!user) {
    console.warn(`[Auth] User "${normalizedEmail}" not found. Re-seeding and retrying...`);
    await ensureSeedAuthUsers();
    user = await getAuthUserByEmailDB(normalizedEmail);
  }

  if (!user) {
    // This should be practically unreachable for demo accounts.
    console.error(`[Auth] FATAL: Login failed for "${normalizedEmail}". User not found even after re-seeding.`);
    throw new Error("Invalid email or password.");
  }

  console.log(`[Auth] Found user:`, user.email, `(ID: ${user.id})`);

  if (user.password !== password) {
    console.error(`[Auth] Login failed for "${normalizedEmail}". Password mismatch.`);
    throw new Error("Invalid email or password.");
  }

  console.log(`[Auth] Login successful for user: ${user.name}`);
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