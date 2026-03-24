import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { AccountingPrintPage } from "@/pages/AccountingPrintPage";
import { BoardPage } from "@/pages/BoardPage";
import { SettingsPage } from "@/pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/accounting/print/:periodId",
    element: <AccountingPrintPage />
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);
