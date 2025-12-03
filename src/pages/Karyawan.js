import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Users, Plus, RefreshCw, Pencil, Trash2, Shield, ChevronDown, Crown, User, Check, X, Loader2 } from "lucide-react";

const Karyawan = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForPermission, setSelectedUserForPermission] = useState(null);
  const [formData, setFormData] = useState({ username: "", password_hash: "", full_name: "", role: "kasir", is_active: true });
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const customizableModules = [
    { key: "dashboard", name: "Dashboard", description: "Analytics & Monitoring" },
    { key: "history", name: "Riwayat", description: "Riwayat Transaksi" },
    { key: "stok", name: "Stok", description: "Manajemen Stok" },
    { key: "reservasi", name: "Reservasi", description: "Reservasi Online" },
    { key: "claim_photo", name: "Claim Photo", description: "Klaim Foto" },
  ];

  const loadUserPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("user_permissions").select("*");
      if (error) throw error;
      const permissionsByUser = {};
      data.forEach((p) => {
        if (!permissionsByUser[p.user_id]) permissionsByUser[p.user_id] = {};
        permissionsByUser[p.user_id][p.module_name] = p.has_access;
      });
      setUserPermissions(permissionsByUser);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").select("*").order("role").order("full_name");
      if (error) throw error;
      setUsers(data || []);
      await loadUserPermissions();
    } catch (error) {
      alert("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [loadUserPermissions]);

  const createDefaultPermissions = async (userId, role) => {
    try {
      const defaultPermissions = customizableModules.map((m) => ({
        user_id: userId, module_name: m.key, has_access: role === "admin",
      }));
      await supabase.from("user_permissions").insert(defaultPermissions);
    } catch (error) {
      console.error("Error creating permissions:", error);
    }
  };

  const updateUserPermission = async (userId, moduleName, hasAccess) => {
    try {
      const { error } = await supabase.from("user_permissions").upsert(
        { user_id: userId, module_name: moduleName, has_access: hasAccess },
        { onConflict: "user_id,module_name" }
      );
      if (error) throw error;
      setUserPermissions((prev) => ({ ...prev, [userId]: { ...prev[userId], [moduleName]: hasAccess } }));
    } catch (error) {
      alert("Gagal update permission: " + error.message);
    }
  };

  const checkUsernameAvailability = useCallback(async (username) => {
    if (!username || username.length < 3) { setUsernameError(""); return; }
    setUsernameCheckLoading(true);
    try {
      const { data } = await supabase.from("users").select("username").eq("username", username);
      if (data?.length > 0 && (!editingUser || data[0].username !== editingUser.username)) {
        setUsernameError("Username sudah digunakan");
      } else {
        setUsernameError("");
      }
    } finally {
      setUsernameCheckLoading(false);
    }
  }, [editingUser]);

  useEffect(() => {
    const timeout = setTimeout(() => formData.username && checkUsernameAvailability(formData.username), 500);
    return () => clearTimeout(timeout);
  }, [formData.username, checkUsernameAvailability]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (usernameError) return alert(usernameError);
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").insert([formData]).select();
      if (error) throw error;
      if (data?.[0]) await createDefaultPermissions(data[0].id, formData.role);
      resetForm();
      setShowAddDialog(false);
      await loadUsers();
      alert("Karyawan berhasil ditambahkan");
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (usernameError && formData.username !== editingUser?.username) return alert(usernameError);
    setLoading(true);
    try {
      const updateData = { username: formData.username, full_name: formData.full_name, role: formData.role, is_active: formData.is_active };
      if (formData.password_hash) updateData.password_hash = formData.password_hash;
      const { error } = await supabase.from("users").update(updateData).eq("id", editingUser.id);
      if (error) throw error;
      resetForm();
      setShowEditDialog(false);
      await loadUsers();
      alert("Karyawan berhasil diupdate");
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.id === user.id) return alert("Tidak dapat menghapus akun sendiri");
    if (!window.confirm(`Hapus "${userToDelete.full_name}"?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("users").delete().eq("id", userToDelete.id);
      if (error) throw error;
      await loadUsers();
      alert("Karyawan berhasil dihapus");
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (u) => {
    setEditingUser(u);
    setFormData({ username: u.username, password_hash: "", full_name: u.full_name, role: u.role, is_active: u.is_active });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({ username: "", password_hash: "", full_name: "", role: "kasir", is_active: true });
    setUsernameError("");
    setEditingUser(null);
  };

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const adminUsers = users.filter((u) => u.role === "admin");
  const kasirUsers = users.filter((u) => u.role === "kasir");

  return (
    <div className="dark h-screen flex flex-col bg-background">
      <div className="flex-1 p-4 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Manajemen Karyawan</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
            </Button>
            {user.role === "admin" && (
              <Button size="sm" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Karyawan
              </Button>
            )}
          </div>
        </div>

        {/* Admin Section */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" /> Administrator ({adminUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adminUsers.map((u) => (
                <UserRow key={u.id} userItem={u} currentUser={user} userPermissions={userPermissions} onEdit={startEdit} onDelete={handleDeleteUser} onPermission={(u) => { setSelectedUserForPermission(u); setShowPermissionDialog(true); }} />
              ))}
              {adminUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Tidak ada administrator</p>}
            </div>
          </CardContent>
        </Card>

        {/* Kasir Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" /> Kasir ({kasirUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kasirUsers.map((u) => (
                <UserRow key={u.id} userItem={u} currentUser={user} userPermissions={userPermissions} onEdit={startEdit} onDelete={handleDeleteUser} onPermission={(u) => { setSelectedUserForPermission(u); setShowPermissionDialog(true); }} />
              ))}
              {kasirUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Tidak ada kasir</p>}
            </div>
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Karyawan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <Label>Username</Label>
                <div className="relative">
                  <Input value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} placeholder="Username..." required />
                  {usernameCheckLoading && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin" />}
                </div>
                {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
                {formData.username && !usernameError && !usernameCheckLoading && formData.username.length >= 3 && <p className="text-xs text-green-500 mt-1">Username tersedia</p>}
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={formData.password_hash} onChange={(e) => setFormData((p) => ({ ...p, password_hash: e.target.value }))} placeholder="Password..." required minLength={6} />
              </div>
              <div>
                <Label>Nama Lengkap</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))} placeholder="Nama lengkap..." required />
              </div>
              <div>
                <Label>Role</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.role === "admin" ? "Administrator" : "Kasir"}
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem onClick={() => setFormData((p) => ({ ...p, role: "kasir" }))}><User className="w-4 h-4 mr-2" /> Kasir</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFormData((p) => ({ ...p, role: "admin" }))}><Crown className="w-4 h-4 mr-2" /> Administrator</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
                <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Tambah"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Karyawan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label>Username</Label>
                <div className="relative">
                  <Input value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} required />
                  {usernameCheckLoading && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin" />}
                </div>
                {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
              </div>
              <div>
                <Label>Password (kosongkan jika tidak diubah)</Label>
                <Input type="password" value={formData.password_hash} onChange={(e) => setFormData((p) => ({ ...p, password_hash: e.target.value }))} placeholder="Password baru..." />
              </div>
              <div>
                <Label>Nama Lengkap</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div>
                <Label>Role</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.role === "admin" ? "Administrator" : "Kasir"}
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem onClick={() => setFormData((p) => ({ ...p, role: "kasir" }))}><User className="w-4 h-4 mr-2" /> Kasir</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFormData((p) => ({ ...p, role: "admin" }))}><Crown className="w-4 h-4 mr-2" /> Administrator</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between">
                <Label>Status Aktif</Label>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
                <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Update"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Permission Dialog */}
        <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Atur Permission - {selectedUserForPermission?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Kasir selalu dapat diakses. Karyawan hanya untuk Admin.</p>
              {customizableModules.map((m) => {
                const hasAccess = userPermissions[selectedUserForPermission?.id]?.[m.key] || false;
                return (
                  <div key={m.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                    </div>
                    <Switch checked={hasAccess} onCheckedChange={(v) => updateUserPermission(selectedUserForPermission?.id, m.key, v)} />
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowPermissionDialog(false)}>Selesai</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// User Row Component
const UserRow = ({ userItem, currentUser, userPermissions, onEdit, onDelete, onPermission }) => {
  const accessCount = Object.values(userPermissions[userItem.id] || {}).filter(Boolean).length;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
          {userItem.full_name?.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-sm">{userItem.full_name}</p>
          <p className="text-xs text-muted-foreground">@{userItem.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={userItem.is_active ? "success" : "destructive"}>
          {userItem.is_active ? <><Check className="w-3 h-3 mr-1" /> Aktif</> : <><X className="w-3 h-3 mr-1" /> Nonaktif</>}
        </Badge>
        <Badge variant="outline">{accessCount + 1} modul</Badge>
        {currentUser.role === "admin" && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(userItem)}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPermission(userItem)}><Shield className="w-4 h-4" /></Button>
            {userItem.id !== currentUser.id && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(userItem)}><Trash2 className="w-4 h-4" /></Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Karyawan;