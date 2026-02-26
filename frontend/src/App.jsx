import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectBoard from "@/pages/ProjectBoard";
import Tasks from "@/pages/Tasks";
import Notifications from "@/pages/Notifications";
import Members from "@/pages/Members";
import Reports from "@/pages/Reports";
import { useAuth } from "@/context/AuthContext";

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <Sidebar />
      <main>
        <Topbar />
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <ProtectedLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id/board" element={<ProjectBoard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/members" element={<Members />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}
