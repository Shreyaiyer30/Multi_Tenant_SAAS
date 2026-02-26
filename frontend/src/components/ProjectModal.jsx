import { useState } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ProjectModal({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("projects/", form);
      toast.success("Project created");
      setForm({ name: "", description: "" });
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Add a project to the currently selected workspace.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <Input placeholder="Project name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
