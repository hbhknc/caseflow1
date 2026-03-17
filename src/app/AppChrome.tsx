import { createContext, useContext } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type AppChromeContextValue = {
  headerToolbar: ReactNode;
  setHeaderToolbar: Dispatch<SetStateAction<ReactNode>>;
};

export const AppChromeContext = createContext<AppChromeContextValue | null>(null);

export function useAppChrome() {
  const value = useContext(AppChromeContext);

  if (!value) {
    throw new Error("useAppChrome must be used within AppChromeContext.");
  }

  return value;
}
