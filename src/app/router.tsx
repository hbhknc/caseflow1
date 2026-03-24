import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { AccountingEditorPage } from "@/pages/AccountingEditorPage";
import { AccountingHubPage } from "@/pages/AccountingHubPage";
import { AccountingNewPage } from "@/pages/AccountingNewPage";
import { AccountingPrintPage } from "@/pages/AccountingPrintPage";
import { BoardPage } from "@/pages/BoardPage";
import { SettingsPage } from "@/pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/accounting/:accountingId/print",
    element: <AccountingPrintPage />
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "accounting", element: <AccountingHubPage /> },
      { path: "accounting/new", element: <AccountingNewPage /> },
      { path: "accounting/:accountingId", element: <AccountingEditorPage /> }
    ]
  }
]);
