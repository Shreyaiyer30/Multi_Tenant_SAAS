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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Workspace Members</h1>
                <Button onClick={() => setShowInviteModal(true)}>
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
                        <p className="text-sm text-red-500">{error}</p>
                    ) : loading ? (
                        <p className="text-sm text-muted-foreground">Loading members...</p>
                    ) : (
                        <div className="rounded-md border">
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
                                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogContent>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                        <Button onClick={handleInvite}>Invite</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
