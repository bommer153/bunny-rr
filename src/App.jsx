import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BunnyProvider } from "./store";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import PlayersPage from "./pages/PlayersPage";
import MatchesPage from "./pages/MatchesPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <BunnyProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BunnyProvider>
  );
}
