import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function Topbar() {
  const { logout } = useAuth();

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={toggleTheme}>
          {document.documentElement.classList.contains("dark") ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
