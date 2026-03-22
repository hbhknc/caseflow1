import { createContext, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { ApiError } from "@/services/apiClient";
import { getCurrentUser as getCurrentUserRequest } from "@/services/currentUser";
import type { CurrentUser } from "@/types/api";

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCurrentUser() {
    setIsLoading(true);

    try {
      const response = await getCurrentUserRequest();
      setCurrentUser(response.user);
      setError(null);
    } catch (caughtError) {
      setCurrentUser(null);

      if (caughtError instanceof ApiError) {
        setError(
          caughtError.status === 401 || caughtError.status === 403
            ? "Sign in through Cloudflare Access to use CaseFlow."
            : caughtError.message || "Unable to verify the current user."
        );
      } else {
        setError("Unable to verify the current user.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setCurrentUser(null);
      setError("Sign in through Cloudflare Access to use CaseFlow.");
      setIsLoading(false);
    }

    window.addEventListener("caseflow:unauthorized", handleUnauthorized as EventListener);

    return () =>
      window.removeEventListener("caseflow:unauthorized", handleUnauthorized as EventListener);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: Boolean(currentUser),
        currentUser,
        error,
        refresh: loadCurrentUser,
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
