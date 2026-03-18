import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { BoardPage } from "@/pages/BoardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);
