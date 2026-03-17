import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api/api";
import ProjectModal from "@/components/ProjectModal";
import ProjectMembersModal from "@/components/ProjectMembersModal";
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

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
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
    <div className="p-6 space-y-8 page-enter min-h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-syne font-bold text-text tracking-tight">Projects</h1>
          <p className="text-xs text-muted font-medium uppercase tracking-[0.2em] mt-1">Workspace / Task Management / Projects</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setOpen(true)}
            className="h-11 px-6 rounded-xl font-syne font-bold text-sm bg-accent text-background hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,229,192,0.3)] active:scale-95"
          >
            + Create New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, idx) => (
          <div 
            key={project.id} 
            onClick={() => navigate(`/projects/${project.id}/board`)}
            className="animate-fade-up group relative cursor-pointer rounded-2xl border p-6 transition-all hover:border-accent/50 elevate-hover"
            style={{ 
               backgroundColor: 'var(--surface)', 
               borderColor: 'var(--border)',
               animationDelay: `${idx * 0.1}s`
            }}
          >
            {/* Status Badge */}
            <div className="absolute top-6 right-6 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest text-muted group-hover:text-accent transition-colors" style={{ borderColor: 'var(--border)' }}>
              {project.status || "ongoing"}
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-syne font-bold text-text group-hover:text-accent transition-colors mb-2 truncate max-w-[80%]">
                {project.name}
              </h3>
              <p className="text-xs text-muted line-clamp-2 min-h-[32px] leading-relaxed">
                {project.description || "No project description provided."}
              </p>
            </div>

            <div className="space-y-4">
               <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted mb-2 uppercase tracking-tighter">
                    <span>Progress</span>
                    <span className="text-text">{project.completion_percent ?? 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-accent2 to-accent transition-all duration-1000" 
                      style={{ width: `${project.completion_percent ?? 0}%` }} 
                    />
                  </div>
               </div>

               <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex -space-x-2">
                     <div className="w-7 h-7 rounded-full border-2 border-surface bg-accent2 flex items-center justify-center text-[9px] font-bold">A</div>
                     <div className="w-7 h-7 rounded-full border-2 border-surface bg-accent5 flex items-center justify-center text-[9px] font-bold">B</div>
                     <div className="w-7 h-7 rounded-full border-2 border-surface bg-surface2 flex items-center justify-center text-[9px] font-bold text-muted">+3</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(project);
                        setMembersOpen(true);
                      }}
                      className="p-2 rounded-lg bg-surface2 border border-border text-muted hover:text-white hover:border-accent transition-all"
                      title="Manage Members"
                    >
                      👥
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-2 rounded-lg bg-surface2 border border-border text-muted hover:text-accent3 hover:border-accent3/50 transition-all"
                      title="Delete Project"
                    >
                      🗑️
                    </button>
                  </div>
               </div>
            </div>
          </div>
        ))}

        {!projects.length && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--border)' }}>
             <span className="text-6xl mb-4 opacity-10">📁</span>
             <p className="font-syne font-bold text-lg">No Projects Found</p>
             <p className="text-xs">Start by creating your first workspace project above.</p>
          </div>
        )}
      </div>

      <ProjectModal open={open} onOpenChange={setOpen} onCreated={loadProjects} />
      <ProjectMembersModal 
        open={membersOpen} 
        onOpenChange={setMembersOpen} 
        project={selectedProject} 
        workspaceMembers={workspaceMembers} 
        onUpdated={loadProjects} 
      />
    </div>
  );
}
