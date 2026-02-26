import { useEffect, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ProjectMembersModal({ open, onOpenChange, project, workspaceMembers = [], onUpdated }) {
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("member");

  const load = () => {
    if (!project?.id) return;
    api
      .get(`projects/${project.id}/members/`)
      .then((res) => setMembers(res.data || []))
      .catch(() => setMembers([]));
  };

  useEffect(() => {
    if (open) load();
  }, [open, project?.id]);

  const addMember = async () => {
    if (!userId) {
      toast.error("Please select a member");
      return;
    }
    try {
      await api.post(`projects/${project.id}/members/`, { user_id: userId, role });
      toast.success("Member added");
      setUserId("");
      load();
      onUpdated?.();
    } catch (err) {
      toast.error("Failed to add member");
    }
  };

  const removeMember = async (targetUserId) => {
    try {
      await api.delete(`projects/${project.id}/members/${targetUserId}/`);
      toast.success("Member removed");
      load();
      onUpdated?.();
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Members</DialogTitle>
          <DialogDescription>Manage who can be assigned tasks for this project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border p-2">
              <span className="text-sm font-medium">
                {m.user.display_name || m.user.email}
                <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">{m.role}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => removeMember(m.user.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">Remove</Button>
            </div>
          ))}
          {members.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No members added yet.</p>}
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Select workspace member</option>
              {workspaceMembers.map((m) => (
                <option key={m.user?.id} value={m.user?.id}>
                  {m.user?.display_name || m.user?.email}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>
          <Button onClick={addMember} className="w-full">Add Member</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

