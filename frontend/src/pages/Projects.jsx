import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api/api";
import ProjectModal from "@/components/ProjectModal";
import ProjectMembersModal from "@/components/ProjectMembersModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const currentWorkspace = (user?.workspaces || []).find((ws) => ws.slug === tenant);
  const canCreate = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";

  const loadProjects = () => {
    api
      .get("projects/")
      .then((res) => setProjects(res.data.results || res.data || []))
      .catch(() => setProjects([]));
  };

  const loadWorkspaceMembers = () => {
    api
      .get("members/")
      .then((res) => setWorkspaceMembers(res.data.results || res.data || []))
      .catch(() => setWorkspaceMembers([]));
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Delete this project? This action cannot be undone.")) return;
    try {
      await api.delete(`projects/${projectId}/`);
      toast.success("Project deleted");
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    } catch {
      toast.error("Unable to delete project");
    }
  };

  useEffect(() => {
    loadProjects();
    loadWorkspaceMembers();
  }, [tenant]);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {canCreate ? <Button className="h-11 w-full sm:w-auto" onClick={() => setOpen(true)}>Create Project</Button> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="cursor-pointer min-w-0">
            <CardHeader className="space-y-2" onClick={() => navigate(`/projects/${project.id}/board`)}>
              <div className="flex items-center justify-between">
                <CardTitle className="line-clamp-1 min-w-0">{project.name}</CardTitle>
                <span className="rounded-full border px-2 py-0.5 text-xs">{project.status || "ongoing"}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${project.completion_percent ?? 0}%` }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="line-clamp-2 text-sm text-muted-foreground">{project.description || "No description"}</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-11 w-full sm:w-auto"
                  onClick={() => {
                    setSelectedProject(project);
                    setMembersOpen(true);
                  }}
                >
                  Manage Members
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-11 w-full sm:w-auto"
                  onClick={() => handleDeleteProject(project.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ProjectModal open={open} onOpenChange={setOpen} onCreated={loadProjects} />
      <ProjectMembersModal open={membersOpen} onOpenChange={setMembersOpen} project={selectedProject} workspaceMembers={workspaceMembers} onUpdated={loadProjects} />
    </div>
  );
}
