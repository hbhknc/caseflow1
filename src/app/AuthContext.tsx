import { createContext, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { ApiError } from "@/services/apiClient";
import { getSession, login as loginRequest, logout as logoutRequest } from "@/services/auth";
import type { AuthUser } from "@/types/api";

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSession()
      .then((session) => {
        setCurrentUser(session.user);
        setError(null);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setCurrentUser(null);
      setError(null);
      setIsLoading(false);
    }

    window.addEventListener("caseflow:unauthorized", handleUnauthorized as EventListener);

    return () =>
      window.removeEventListener("caseflow:unauthorized", handleUnauthorized as EventListener);
  }, []);

  async function handleLogin(username: string, password: string) {
    setIsLoading(true);
    setError(null);

    try {
      const session = await loginRequest(username, password);
      setCurrentUser(session.user);
      return Boolean(session.authenticated);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(
          caughtError.status === 401
            ? "Invalid username or password."
            : caughtError.message || "Unable to sign in right now."
        );
      } else {
        setError("Unable to sign in right now.");
      }

      setCurrentUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      setCurrentUser(null);
      setError(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: Boolean(currentUser),
        currentUser,
        error,
        login: handleLogin,
        logout: handleLogout,
        clearError: () => setError(null)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}
