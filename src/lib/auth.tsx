import React, { createContext, useContext, useState } from "react";
import { currentUser, demoUser, signIn, signOut, signUp, type SessionUser } from "@/services/aws/cognito";

interface AuthCtx {
  user: SessionUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; organisation: string; role: string }) => Promise<void>;
  loginDemo: () => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(currentUser);
  return (
    <Ctx.Provider
      value={{
        user,
        login: async (email, password) => setUser(await signIn(email, password)),
        register: async (input) => setUser(await signUp(input)),
        loginDemo: () => setUser(demoUser()),
        logout: () => {
          signOut();
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
