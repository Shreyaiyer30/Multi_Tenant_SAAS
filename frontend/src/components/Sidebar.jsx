import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LineChart,
  Users
} from "lucide-react";
import { cn } from "@/lib";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Members", href: "/members", icon: Users },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Reports", href: "/reports", icon: LineChart }
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden h-screen border-r bg-card p-4 md:flex md:flex-col md:gap-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <span className="font-semibold">TaskSaaS</span>
      </div>
      <WorkspaceSwitcher />
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => navigate(item.href)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
