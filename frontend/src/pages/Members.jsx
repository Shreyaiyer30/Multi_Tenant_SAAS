import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTenant } from "@/context/TenantContext";

export default function Members() {
    const [members, setMembers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const { tenant } = useTenant();

    const loadMembers = () => {
        if (!tenant) {
            setMembers([]);
            setError("Select a workspace to view members.");
            setLoading(false);
            return;
        }

        setLoading(true);
        api
            .get("members/")
            .then((res) => {
                setMembers(res.data);
                setError("");
            })
            .catch((err) => {
                setError(err?.response?.status === 403 ? "Only workspace admin or owner can manage members." : "Unable to load members.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadMembers();
    }, [tenant]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        try {
            await api.post("members/", { email: inviteEmail, role: inviteRole });
            toast.success("Member invited successfully");
            setShowInviteModal(false);
            setInviteEmail("");
            loadMembers();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to invite member");
        }
    };

    const removeMember = async (membershipId) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.delete(`members/${membershipId}/`);
            toast.success("Member removed");
            loadMembers();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to remove member");
        }
    };

    return (
        <div className="space-y-4 min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold">Workspace Members</h1>
                <Button className="h-11 w-full sm:w-auto" onClick={() => setShowInviteModal(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Members List</CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <p className="text-sm text-danger-foreground">{error}</p>
                    ) : loading ? (
                        <p className="text-sm text-muted-foreground">Loading members...</p>
                    ) : (
                        <div>
                            <div className="sm:hidden space-y-2">
                                {members.map((m) => (
                                    <div key={m.id} className="rounded-xl border border-border/70 bg-card-elevated/40 p-3">
                                        <p className="font-medium line-clamp-1">{m.user.display_name}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{m.user.email}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
                                            <Button variant="ghost" size="sm" className="h-10 text-danger-foreground hover:bg-danger/15" onClick={() => removeMember(m.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden sm:block overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Name</th>
                                            <th className="px-4 py-3 text-left font-medium">Email</th>
                                            <th className="px-4 py-3 text-left font-medium">Role</th>
                                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {members.map((m) => (
                                            <tr key={m.id}>
                                                <td className="px-4 py-3 font-medium">{m.user.display_name}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                                                <td className="px-4 py-3 capitalize">{m.role}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeMember(m.id)}
                                                        className="text-danger-foreground hover:bg-danger/15"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogContent className="w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Invite New Member</DialogTitle>
                        <DialogDescription>
                            Invite someone to join your workspace. They must have an account already or will need to create one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                                placeholder="email@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <select
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row">
                        <Button variant="secondary" className="h-11 w-full sm:w-auto" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                        <Button className="h-11 w-full sm:w-auto" onClick={handleInvite}>Invite</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
