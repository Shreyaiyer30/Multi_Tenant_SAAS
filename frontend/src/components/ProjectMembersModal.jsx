import { useEffect, useMemo, useState } from "react";
import { Check, Search, UserPlus2, X } from "lucide-react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function initialsFor(user) {
  const display = user?.display_name || user?.email || "User";
  return display
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ProjectMembersModal({ open, onOpenChange, project, workspaceMembers = [], onUpdated }) {
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [role, setRole] = useState("member");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!project?.id) return;
    api
      .get(`projects/${project.id}/members/`)
      .then((res) => setMembers(res.data || []))
      .catch(() => setMembers([]));
  };

  useEffect(() => {
    if (open) {
      load();
      setSelectedIds([]);
      setSearch("");
    }
  }, [open, project?.id]);

  const existingMemberIds = useMemo(() => new Set(members.map((m) => m.user?.id)), [members]);

  const availableUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (workspaceMembers || []).filter((m) => {
      const user = m.user || {};
      const id = user.id;
      if (!id || existingMemberIds.has(id)) return false;
      if (!q) return true;

      const display = (user.display_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      return display.includes(q) || email.includes(q);
    });
  }, [workspaceMembers, existingMemberIds, search]);

  const selectedUsers = useMemo(
    () => (workspaceMembers || []).filter((m) => selectedIds.includes(m.user?.id)),
    [workspaceMembers, selectedIds]
  );

  const toggleUser = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const addMembers = async () => {
    if (!selectedIds.length) {
      toast.error("Select at least one member");
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        selectedIds.map((userId) => api.post(`projects/${project.id}/members/`, { user_id: userId, role }))
      );
      toast.success(`Added ${selectedIds.length} member${selectedIds.length > 1 ? "s" : ""}`);
      setSelectedIds([]);
      load();
      onUpdated?.();
    } catch {
      toast.error("Failed to add one or more members");
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (targetUserId) => {
    try {
      await api.delete(`projects/${project.id}/members/${targetUserId}/`);
      toast.success("Member removed");
      load();
      onUpdated?.();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[100vw] max-w-none flex-col overflow-hidden rounded-none p-0 sm:h-[88vh] sm:w-[95vw] sm:max-w-4xl sm:rounded-2xl">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>Manage Members</DialogTitle>
            <DialogDescription>Add workspace users to this project and assign a role.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto border-y border-border/70 md:grid-cols-2">
          <section className="flex min-h-0 flex-col p-6 md:border-r md:border-border/70">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Search workspace members"
              />
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {availableUsers.length ? (
                availableUsers.map((entry) => {
                  const user = entry.user || {};
                  const selected = selectedIds.includes(user.id);

                  return (
                    <button
                      key={user.id}
                      className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/55 p-3 text-left transition-all duration-150 hover:bg-muted/30"
                      onClick={() => toggleUser(user.id)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-hover to-primary text-xs font-semibold text-primary-foreground">
                          {initialsFor(user)}
                        </span>
                        <span className="min-w-0">
                          <p className="truncate text-sm font-medium">{user.display_name || "Workspace member"}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </span>
                      </div>
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary-hover bg-primary text-primary-foreground" : "border-border"}`}>
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                  No available users found.
                </p>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Added ({selectedIds.length})</h3>
              <span className="text-xs text-muted-foreground">Role will apply to all selected users</span>
            </div>

            <div className="min-h-[130px] max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {selectedUsers.length ? (
                selectedUsers.map((entry) => {
                  const user = entry.user || {};
                  return (
                    <div key={user.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card/55 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary-foreground">
                          {initialsFor(user)}
                        </span>
                        <span className="min-w-0">
                          <p className="truncate text-sm font-medium">{user.display_name || "Workspace member"}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </span>
                      </div>
                      <button className="rounded-md p-1 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground" onClick={() => toggleUser(user.id)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                  Select users from the left to add them to this project.
                </p>
              )}
            </div>

            <div className="mt-6 min-h-0 flex-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Current project members</p>
              <div className="min-h-0 h-full max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.user.display_name || m.user.email}</p>
                      <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-danger-foreground hover:bg-danger/15" onClick={() => removeMember(m.user.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                {!members.length ? <p className="text-sm text-muted-foreground">No members yet.</p> : null}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col items-stretch gap-3 border-t border-border/70 bg-card/90 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus2 className="h-4 w-4" />
            {selectedIds.length} user{selectedIds.length === 1 ? "" : "s"} selected
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="h-11 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm sm:h-10 sm:w-auto"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
            <Button variant="ghost" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={addMembers} disabled={submitting || !selectedIds.length}>
              {submitting ? "Adding..." : `Add Members (${selectedIds.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
