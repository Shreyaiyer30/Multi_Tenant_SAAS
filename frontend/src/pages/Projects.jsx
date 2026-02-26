import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    loadProjects();
    loadWorkspaceMembers();
  }, [tenant]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {canCreate ? <Button onClick={() => setOpen(true)}>Create Project</Button> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="cursor-pointer">
            <CardHeader className="space-y-2" onClick={() => navigate(`/projects/${project.id}/board`)}>
              <div className="flex items-center justify-between">
                <CardTitle>{project.name}</CardTitle>
                <span className="rounded-full border px-2 py-0.5 text-xs">{project.status || "ongoing"}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${project.completion_percent ?? 0}%` }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{project.description || "No description"}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedProject(project);
                  setMembersOpen(true);
                }}
              >
                Manage Members
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <ProjectModal open={open} onOpenChange={setOpen} onCreated={loadProjects} />
      <ProjectMembersModal open={membersOpen} onOpenChange={setMembersOpen} project={selectedProject} workspaceMembers={workspaceMembers} onUpdated={loadProjects} />
    </div>
  );
}
