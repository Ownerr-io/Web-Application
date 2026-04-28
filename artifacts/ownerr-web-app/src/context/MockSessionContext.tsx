import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAuthUserById,
  listAuthUsers,
  loginAuthUser,
  registerAuthUser,
  type AuthRole,
  type AuthUser,
} from "@/lib/mockAuthService";

const STORAGE_KEY = "ownerr-mock-session-user";

type MockSessionContextValue = {
  currentUser: AuthUser | null;
  users: AuthUser[];
  isAuthenticated: boolean;
  isBuyer: boolean;
  isFounder: boolean;
  authDialogOpen: boolean;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    role: AuthRole;
  }) => Promise<AuthUser>;
  logout: () => void;
};

const MockSessionContext = createContext<MockSessionContextValue | null>(null);

function loadStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function MockSessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const allUsers = await listAuthUsers();
      setUsers(allUsers);
      const storedUserId = loadStoredUserId();
      if (!storedUserId) return;
      const stored = await getAuthUserById(storedUserId);
      if (stored) setCurrentUser(stored);
    })();
  }, []);

  const value = useMemo<MockSessionContextValue>(
    () => ({
      currentUser,
      users,
      isAuthenticated: !!currentUser,
      isBuyer: currentUser?.role === "buyer",
      isFounder: currentUser?.role === "founder",
      authDialogOpen,
      openAuthDialog: () => setAuthDialogOpen(true),
      closeAuthDialog: () => setAuthDialogOpen(false),
      login: async (email, password) => {
        const user = await loginAuthUser(email, password);
        setCurrentUser(user);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, user.id);
        }
        setAuthDialogOpen(false);
        return user;
      },
      register: async (input) => {
        const user = await registerAuthUser(input);
        setUsers((prev) => [...prev, user]);
        setCurrentUser(user);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, user.id);
        }
        setAuthDialogOpen(false);
        return user;
      },
      logout: () => {
        setCurrentUser(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      },
    }),
    [authDialogOpen, currentUser, users],
  );

  return <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>;
}

export function useMockSession(): MockSessionContextValue {
  const context = useContext(MockSessionContext);
  if (!context) {
    throw new Error("useMockSession must be used within MockSessionProvider");
  }
  return context;
}
