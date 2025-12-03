import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { cn } from "../lib/utils";
import { RefreshCw, Plus, Package, Camera, Image, Users, Coffee, Cookie, Link, Upload, Clock, AlertTriangle, Check } from "lucide-react";

const categories = {
  studio: { name: "Paket Studio", Icon: Camera, color: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-500" },
  addon: { name: "Add-on Cetak", Icon: Image, color: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-500" },
  fotogroup: { name: "Foto Group", Icon: Users, color: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-500" },
  minuman: { name: "Minuman", Icon: Coffee, color: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-500" },
  snack: { name: "Snack", Icon: Cookie, color: "bg-yellow-100 dark:bg-yellow-900/30", iconColor: "text-yellow-500" },
};

const Stok = ({ user, onLogout }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageInputType, setImageInputType] = useState("url");

  const initialFormData = { name: "", category: "studio", price: "", stock: "", image_url: "", duration: "", is_active: true };
  const [formData, setFormData] = useState(initialFormData);

  const formatRupiah = (num) => (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const isUnlimitedStock = (category) => ["studio", "addon", "fotogroup"].includes(category);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("items").select("*").order("category").order("name");
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      alert("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) return alert("Format tidak didukung");
    if (file.size > 10 * 1024 * 1024) return alert("Max 10MB");
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(path);
      return publicUrl;
    } catch (error) {
      alert("Gagal upload: " + error.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedFile(null);
    setImagePreview(null);
    setImageInputType("url");
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.role !== "admin") return;
    setLoading(true);
    try {
      let imageUrl = formData.image_url;
      if (selectedFile && imageInputType === "upload") {
        imageUrl = await uploadImage(selectedFile);
        if (!imageUrl) { setLoading(false); return; }
      }
      const payload = {
        name: formData.name,
        category: formData.category,
        price: parseInt(formData.price),
        stock: isUnlimitedStock(formData.category) ? 0 : parseInt(formData.stock) || 0,
        image_url: imageUrl || null,
        duration: formData.duration || null,
        is_active: formData.is_active,
      };

      if (editingItem) {
        const { error } = await supabase.from("items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        setShowEditDialog(false);
      } else {
        const { error } = await supabase.from("items").insert(payload);
        if (error) throw error;
        setShowAddDialog(false);
      }
      resetForm();
      loadItems();
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (item) => {
    if (user.role !== "admin") return;
    try {
      const { error } = await supabase.from("items").update({ is_active: !item.is_active }).eq("id", item.id);
      if (error) throw error;
      loadItems();
    } catch (error) {
      alert("Gagal: " + error.message);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stock: item.stock?.toString() || "0",
      image_url: item.image_url || "",
      duration: item.duration || "",
      is_active: item.is_active,
    });
    setImageInputType("url");
    setSelectedFile(null);
    setImagePreview(null);
    setShowEditDialog(true);
  };

  useEffect(() => { loadItems(); }, [loadItems]);

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const groupedItems = Object.keys(categories).reduce((acc, cat) => {
    acc[cat] = filteredItems.filter((item) => item.category === cat);
    return acc;
  }, {});

  const ItemForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Nama Item</Label>
          <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
        </div>
        <div>
          <Label>Kategori</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categories).map(([k, v]) => {
                const IconComp = v.Icon;
                return <SelectItem key={k} value={k}><span className="flex items-center gap-2"><IconComp className="w-4 h-4" /> {v.name}</span></SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Harga (Rp)</Label>
          <Input type="number" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} min="0" required />
        </div>
        {!isUnlimitedStock(formData.category) && (
          <div>
            <Label>Stok</Label>
            <Input type="number" value={formData.stock} onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value }))} min="0" required />
          </div>
        )}
        {formData.category === "studio" && (
          <div>
            <Label>Durasi</Label>
            <Input value={formData.duration} onChange={(e) => setFormData((p) => ({ ...p, duration: e.target.value }))} placeholder="60Menit/Sesi" />
          </div>
        )}
        <div className="col-span-2">
          <Label>Gambar</Label>
          <div className="flex gap-2 mb-2">
            <Button type="button" size="sm" variant={imageInputType === "url" ? "default" : "outline"} onClick={() => { setImageInputType("url"); setSelectedFile(null); setImagePreview(null); }}><Link className="w-4 h-4 mr-1" /> URL</Button>
            <Button type="button" size="sm" variant={imageInputType === "upload" ? "default" : "outline"} onClick={() => { setImageInputType("upload"); setFormData((p) => ({ ...p, image_url: "" })); }}><Upload className="w-4 h-4 mr-1" /> Upload</Button>
          </div>
          {imageInputType === "url" ? (
            <Input type="url" value={formData.image_url} onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
          ) : (
            <Input type="file" accept="image/*" onChange={handleFileSelect} />
          )}
          {(imagePreview || formData.image_url) && (
            <img src={imagePreview || formData.image_url} alt="Preview" className="mt-2 w-24 h-18 object-cover rounded border" onError={(e) => e.target.style.display = "none"} />
          )}
          {uploadingImage && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <Label>Status Aktif</Label>
          <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); setShowEditDialog(false); }}>Batal</Button>
        <Button type="submit" disabled={loading || uploadingImage}>{loading ? "Menyimpan..." : editingItem ? "Update" : "Tambah"}</Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Package className="w-8 h-8" /> Manajemen Stok</h1>
            <p className="text-muted-foreground">Kelola item dan inventaris</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.role}</p>
            </div>
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </div>
        </div>

        {/* Filter & Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Input placeholder="Cari item..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {Object.entries(categories).map(([k, v]) => {
                    const IconComp = v.Icon;
                    return <SelectItem key={k} value={k}><span className="flex items-center gap-2"><IconComp className="w-4 h-4" /> {v.name}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadItems} disabled={loading}>
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
              </Button>
              {user.role === "admin" && (
                <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Item
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(categories).map(([k, v]) => {
            const IconComp = v.Icon;
            return (
              <Card key={k} className={cn(v.color)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <IconComp className={cn("w-8 h-8", v.iconColor)} />
                    <div>
                      <p className="text-2xl font-bold">{items.filter((i) => i.category === k).length}</p>
                      <p className="text-xs text-muted-foreground">{v.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Memuat data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([cat, catItems]) => {
              if (catItems.length === 0) return null;
              const catInfo = categories[cat];
              return (
                <Card key={cat}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <catInfo.Icon className={cn("w-6 h-6", catInfo.iconColor)} />
                      {catInfo.name}
                      <Badge variant="secondary">{catItems.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md",
                            catInfo.color,
                            !item.is_active && "opacity-50"
                          )}
                          onClick={() => user.role === "admin" && startEdit(item)}
                        >
                          {/* Image */}
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-20 object-cover rounded mb-2"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-20 flex items-center justify-center mb-2">
                              <catInfo.Icon className={cn("w-10 h-10", catInfo.iconColor)} />
                            </div>
                          )}

                          {/* Name */}
                          <h4 className="font-semibold text-sm truncate mb-1">{item.name}</h4>

                          {/* Price */}
                          <p className="text-sm font-bold text-primary">Rp {formatRupiah(item.price)}</p>

                          {/* Stock & Status */}
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant={item.is_active ? "success" : "destructive"} className="text-xs">
                              {item.is_active ? "Aktif" : "Off"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                isUnlimitedStock(item.category)
                                  ? "text-blue-500"
                                  : item.stock > 10
                                    ? "text-green-500"
                                    : item.stock > 0
                                      ? "text-yellow-500"
                                      : "text-red-500"
                              )}
                            >
                              {isUnlimitedStock(item.category) ? "∞" : item.stock || 0}
                            </Badge>
                          </div>

                          {/* Duration for studio */}
                          {item.duration && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duration}</p>
                          )}

                          {/* Admin hint */}
                          {user.role === "admin" && (
                            <p className="text-xs text-muted-foreground text-center mt-2 border-t pt-2">
                              Klik untuk edit
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada item ditemukan</p>
              </div>
            )}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Item Baru</DialogTitle>
            </DialogHeader>
            <ItemForm />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowEditDialog(open); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Item: {editingItem?.name}</DialogTitle>
            </DialogHeader>
            <ItemForm />
            {editingItem && user.role === "admin" && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status Item</span>
                  <Button
                    variant={editingItem.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => { handleToggleActive(editingItem); setShowEditDialog(false); }}
                  >
                    {editingItem.is_active ? <><AlertTriangle className="w-4 h-4 mr-1" /> Nonaktifkan</> : <><Check className="w-4 h-4 mr-1" /> Aktifkan</>}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Stok;
