import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/context/AuthContext";

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectBoard = lazy(() => import("@/pages/ProjectBoard"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Members = lazy(() => import("@/pages/Members"));
const Reports = lazy(() => import("@/pages/Reports"));
const Billing = lazy(() => import("@/pages/Billing"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Settings = lazy(() => import("@/pages/Settings"));
const Messages = lazy(() => import("@/pages/Messages"));

function RouteFallback() {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function ProtectedLayout() {
  const location = useLocation();
  const [timeRange, setTimeRange] = useState("7d");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div
      className="min-h-screen bg-background lg:grid lg:transition-[grid-template-columns] lg:duration-300"
      style={{ gridTemplateColumns: sidebarCollapsed ? "72px 1fr" : "260px 1fr" }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <main className="min-w-0 flex flex-col h-screen overflow-hidden">
        <Topbar
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          collapsed={sidebarCollapsed}
          onToggleMobileSidebar={() => setMobileSidebarOpen((value) => !value)}
        />
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Outlet context={{ timeRange, setTimeRange }} />
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
    <Suspense fallback={<RouteFallback />}>
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
          <Route path="/billing" element={<Billing />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
