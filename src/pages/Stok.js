import React, { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { supabase } from "../supabaseClient";

const Stok = ({ user, onLogout }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const scrollPositionRef = useRef(0);
  const containerRef = useRef(null);

  // New states for image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageInputType, setImageInputType] = useState("url"); // 'url' atau 'upload'

  const [formData, setFormData] = useState({
    name: "",
    category: "studio",
    price: "",
    stock: "",
    image_url: "",
    duration: "",
    is_active: true,
  });

  // Format rupiah
  const formatRupiah = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Check if item has unlimited stock (studio, addon, dan fotogroup)
  const isUnlimitedStock = (category) => {
    return category === "studio" || category === "addon" || category === "fotogroup";
  };

  // Get display stock text
  const getStockDisplay = (item) => {
    if (isUnlimitedStock(item.category)) {
      return "∞";
    }
    return item.stock || 0;
  };

  // Get stock color based on category and stock
  const getStockColor = (item) => {
    if (isUnlimitedStock(item.category)) {
      return "#3498db"; // Blue for unlimited
    }
    const stock = item.stock || 0;
    return stock > 10 ? "#27ae60" : stock > 0 ? "#f39c12" : "#e74c3c";
  };

  // Get current date
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle file selection for image upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        showToast(
          "Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP",
          "error"
        );
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showToast("Ukuran file terlalu besar. Maksimal 10MB", "error");
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (file) => {
    if (!file) return null;

    setUploadingImage(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `items/${fileName}`;

      console.log("📤 Uploading file to:", filePath);

      // Upload file to Supabase Storage with explicit options
      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          duplex: "half", // Add this for better compatibility
        });

      if (error) {
        console.error("❌ Upload error details:", error);
        throw error;
      }

      console.log("✅ Upload success:", data);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      console.log("📋 Public URL:", publicUrl);

      return publicUrl;
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      // More detailed error message
      let errorMessage = error.message;
      if (error.message?.includes("Unauthorized")) {
        errorMessage =
          "Akses tidak diizinkan. Coba refresh halaman dan login ulang.";
      } else if (error.message?.includes("row-level security")) {
        errorMessage = "Masalah keamanan database. Hubungi administrator.";
      }
      showToast("Gagal upload gambar: " + errorMessage, "error");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Clear image selection
  const clearImageSelection = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image_url: "" }));
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  // Switch between URL and Upload input types
  const switchImageInputType = (type) => {
    setImageInputType(type);
    clearImageSelection();
  };

  // Handle card click
  const handleCardClick = (itemId) => {
    if (selectedCard === itemId) {
      setSelectedCard(null);
    } else {
      setSelectedCard(itemId);
    }
  };

  // Load items from Supabase
  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error loading items:", error);
      showToast("Gagal memuat data items: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Add new item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (user.role !== "admin") {
      showToast("Hanya admin yang dapat menambah item", "error");
      return;
    }

    // Simpan scroll position sebelum add
    saveScrollPosition();

    setLoading(true);
    try {
      let imageUrl = formData.image_url;

      // Upload image if file is selected
      if (selectedFile && imageInputType === "upload") {
        const uploadedUrl = await uploadImageToStorage(selectedFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          showToast("Gagal upload gambar", "error");
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from("items")
        .insert({
          name: formData.name,
          category: formData.category,
          price: parseInt(formData.price),
          stock: isUnlimitedStock(formData.category)
            ? 0
            : parseInt(formData.stock) || 0,
          image_url: imageUrl || null,
          duration: formData.duration || null,
          is_active: formData.is_active,
        })
        .select()
        .single();

      if (error) throw error;

      // Update state langsung tanpa reload menggunakan flushSync
      flushSync(() => {
        setItems((prev) => [...prev, data]);
      });

      setFormData({
        name: "",
        category: "studio",
        price: "",
        stock: "",
        image_url: "",
        duration: "",
        is_active: true,
      });
      clearImageSelection();
      setShowAddForm(false);
      showToast("Item berhasil ditambahkan! 🎉");

      // Pulihkan scroll position setelah add
      restoreScrollPosition();
    } catch (error) {
      console.error("Error adding item:", error);
      showToast("Gagal menambah item: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Update item
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (user.role !== "admin") {
      showToast("Hanya admin yang dapat mengupdate item", "error");
      return;
    }

    // Simpan scroll position sebelum update
    saveScrollPosition();

    setLoading(true);
    try {
      let imageUrl = formData.image_url;

      // Upload image if file is selected
      if (selectedFile && imageInputType === "upload") {
        const uploadedUrl = await uploadImageToStorage(selectedFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          showToast("Gagal upload gambar", "error");
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from("items")
        .update({
          name: formData.name,
          category: formData.category,
          price: parseInt(formData.price),
          stock: isUnlimitedStock(formData.category)
            ? 0
            : parseInt(formData.stock) || 0,
          image_url: imageUrl || null,
          duration: formData.duration || null,
          is_active: formData.is_active,
        })
        .eq("id", editingItem.id)
        .select()
        .single();

      if (error) throw error;

      // Update state langsung tanpa reload menggunakan flushSync
      flushSync(() => {
        setItems((prev) =>
          prev.map((item) => (item.id === editingItem.id ? data : item))
        );
      });

      // Tutup modal setelah update berhasil
      cancelEdit();

      showToast("Item berhasil diupdate! ✅");

      // Pulihkan scroll position setelah update
      restoreScrollPosition();
    } catch (error) {
      console.error("Error updating item:", error);
      showToast("Gagal mengupdate item: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Soft delete item (nonaktifkan item)
  const handleDeleteItem = async (item) => {
    if (user.role !== "admin") {
      showToast("Hanya admin yang dapat menghapus item", "error");
      return;
    }

    if (
      !window.confirm(
        `Apakah Anda yakin ingin menonaktifkan item "${item.name}"?\n\nItem akan dinonaktifkan dan tidak muncul dalam transaksi baru.`
      )
    ) {
      return;
    }

    // Simpan scroll position sebelum delete
    saveScrollPosition();

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .update({ is_active: false })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;

      // Update state langsung tanpa reload menggunakan flushSync
      flushSync(() => {
        setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)));
      });

      setSelectedCard(null);
      showToast("Item berhasil dinonaktifkan! ⚠️");

      // Pulihkan scroll position setelah delete
      restoreScrollPosition();
    } catch (error) {
      console.error("Error deactivating item:", error);
      showToast("Gagal menonaktifkan item: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Activate item (aktifkan kembali item)
  const handleActivateItem = async (item) => {
    if (user.role !== "admin") {
      showToast("Hanya admin yang dapat mengaktifkan item", "error");
      return;
    }

    if (
      !window.confirm(
        `Apakah Anda yakin ingin mengaktifkan kembali item "${item.name}"?`
      )
    ) {
      return;
    }

    // Simpan scroll position sebelum activate
    saveScrollPosition();

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .update({ is_active: true })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;

      // Update state langsung tanpa reload menggunakan flushSync
      flushSync(() => {
        setItems((prev) => prev.map((i) => (i.id === item.id ? data : i)));
      });

      setSelectedCard(null);
      showToast("Item berhasil diaktifkan kembali! ✅");

      // Pulihkan scroll position setelah activate
      restoreScrollPosition();
    } catch (error) {
      console.error("Error activating item:", error);
      showToast("Gagal mengaktifkan item: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Start editing
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
    // Reset image upload state
    setImageInputType("url");
    setSelectedFile(null);
    setImagePreview(null);
    setUploadingImage(false);
    setShowEditModal(true);
    setSelectedCard(null);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingItem(null);
    setShowEditModal(false);
    // Reset overflow untuk mengembalikan scroll
    document.body.style.overflow = "unset";
    setFormData({
      name: "",
      category: "studio",
      price: "",
      stock: "",
      image_url: "",
      duration: "",
      is_active: true,
    });
    // Reset image upload state
    clearImageSelection();
    setImageInputType("url");
    setUploadingImage(false);
  };

  // Load items on component mount
  useEffect(() => {
    loadItems();
  }, []);

  // Auto clear stock when category changes to unlimited
  useEffect(() => {
    if (isUnlimitedStock(formData.category)) {
      setFormData((prev) => ({ ...prev, stock: "" }));
    }
  }, [formData.category]);

  // Restore scroll position after items update
  useEffect(() => {
    if (scrollPositionRef.current > 0) {
      restoreScrollPosition();
    }
  }, [items]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && showEditModal) {
        cancelEdit();
      }
    };

    if (showEditModal) {
      document.addEventListener("keydown", handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [showEditModal]);

  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      // Reset overflow untuk mengembalikan scroll
      document.body.style.overflow = "unset";
      cancelEdit();
    }
  };

  const categories = {
    studio: { name: "Paket Studio", icon: "📸", color: "#dbeafe" },
    addon: { name: "Add-on Cetak", icon: "🖼️", color: "#f3e8ff" },
    fotogroup: { name: "Foto Group", icon: "👥", color: "#fff7ed" },
    minuman: { name: "Minuman", icon: "🥤", color: "#dcfce7" },
    snack: { name: "Snack", icon: "🍿", color: "#fef3c7" },
  };

  // Inline styles untuk memastikan card terlihat
  const cardStyle = {
    display: "inline-block",
    width: "160px",
    height: "160px",
    margin: "8px",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "2px solid transparent",
    textAlign: "center",
    verticalAlign: "top",
    position: "relative",
  };

  const selectedCardStyle = {
    ...cardStyle,
    border: "2px solid #3b82f6",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    transform: "scale(1.02)",
  };

  const gridStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "flex-start",
  };

  // Show toast notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  };

  // Save scroll position
  const saveScrollPosition = () => {
    // Simpan posisi scroll dari window
    scrollPositionRef.current =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
  };

  // Restore scroll position
  const restoreScrollPosition = () => {
    setTimeout(() => {
      if (scrollPositionRef.current !== undefined) {
        window.scrollTo({
          top: scrollPositionRef.current,
          left: 0,
          behavior: "instant",
        });
      }
    }, 100); // Tambah delay sedikit untuk memastikan DOM sudah update
  };

  return (
    <div className="App" ref={containerRef}>
      <div className="container">
        {/* Toast Notification */}
        {toast.show && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: toast.type === "error" ? "#e74c3c" : "#27ae60",
              color: "white",
              padding: "15px 20px",
              borderRadius: "8px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              zIndex: "10000",
              fontSize: "14px",
              fontWeight: "bold",
              maxWidth: "300px",
              wordWrap: "break-word",
              animation: "slideIn 0.3s ease-out",
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="header">
          <h1>📦 Manajemen Stok</h1>
          <div className="user-info">
            <p>
              Selamat datang, <strong>{user.full_name}</strong>
            </p>
            <p>{getCurrentDate()}</p>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* Control Buttons */}
        <div
          className="tools"
          style={{
            marginBottom: "20px",
            padding: "20px",
            background: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <button onClick={loadItems} disabled={loading}>
            🔄 {loading ? "Memuat..." : "Refresh Data"}
          </button>
          {user.role === "admin" && (
            <button
              onClick={() => {
                if (showAddForm) {
                  // Closing add form - reset everything
                  setShowAddForm(false);
                  clearImageSelection();
                  setImageInputType("url");
                  setUploadingImage(false);
                  setFormData({
                    name: "",
                    category: "studio",
                    price: "",
                    stock: "",
                    image_url: "",
                    duration: "",
                    is_active: true,
                  });
                } else {
                  // Opening add form - just open
                  setShowAddForm(true);
                }
                setEditingItem(null);
                setSelectedCard(null);
                cancelEdit();
              }}
              style={{ backgroundColor: showAddForm ? "#e74c3c" : "#27ae60" }}
            >
              {showAddForm ? "❌ Batal" : "➕ Tambah Item"}
            </button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && user.role === "admin" && (
          <div
            style={{
              marginBottom: "20px",
              padding: "20px",
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h3>➕ Tambah Item Baru</h3>
            <form onSubmit={handleAddItem}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "15px",
                }}
              >
                <div className="input-group">
                  <label>Nama Item:</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Masukkan nama item..."
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Kategori:</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {Object.entries(categories).map(([key, cat]) => (
                      <option key={key} value={key}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Harga (Rp):</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                {!isUnlimitedStock(formData.category) && (
                  <div className="input-group">
                    <label>Stock:</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          stock: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                )}
                <div className="input-group">
                  <label>Gambar Item:</label>

                  {/* Toggle buttons for input type */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => switchImageInputType("url")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        backgroundColor:
                          imageInputType === "url" ? "#3498db" : "#f8f9fa",
                        color: imageInputType === "url" ? "white" : "#495057",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      🔗 URL Link
                    </button>
                    <button
                      type="button"
                      onClick={() => switchImageInputType("upload")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        backgroundColor:
                          imageInputType === "upload" ? "#3498db" : "#f8f9fa",
                        color:
                          imageInputType === "upload" ? "white" : "#495057",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      📁 Upload File
                    </button>
                  </div>

                  {/* URL Input */}
                  {imageInputType === "url" && (
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          image_url: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/image.jpg"
                    />
                  )}

                  {/* File Upload Input */}
                  {imageInputType === "upload" && (
                    <div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileSelect}
                        style={{ marginBottom: "8px" }}
                      />
                      {uploadingImage && (
                        <div
                          style={{
                            color: "#3498db",
                            fontSize: "0.8rem",
                            marginBottom: "8px",
                          }}
                        >
                          📤 Mengupload gambar...
                        </div>
                      )}
                      {selectedFile && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#27ae60",
                            marginBottom: "8px",
                          }}
                        >
                          ✅ File terpilih: {selectedFile.name}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Image Preview */}
                  {(imagePreview || formData.image_url) && (
                    <div style={{ marginTop: "8px" }}>
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Preview"
                        style={{
                          width: "120px",
                          height: "90px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        onClick={clearImageSelection}
                        style={{
                          marginLeft: "8px",
                          padding: "4px 8px",
                          backgroundColor: "#e74c3c",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.7rem",
                        }}
                      >
                        ❌ Hapus
                      </button>
                    </div>
                  )}

                  <small
                    style={{
                      color: "#7f8c8d",
                      fontSize: "0.8rem",
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    🖼️ Rasio yang disarankan: 4:3 (landscape) - contoh:
                    280x200px. Format: JPG, PNG, GIF, WebP (max 10MB)
                  </small>
                </div>
                {formData.category === "studio" && (
                  <div className="input-group">
                    <label>Durasi Layanan:</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      placeholder="60Menit/Sesi"
                    />
                    <small
                      style={{
                        color: "#7f8c8d",
                        fontSize: "0.8rem",
                        display: "block",
                        marginTop: "4px",
                      }}
                    >
                      ⏱️ Contoh: 30Menit/Sesi, 1Jam/Sesi, 90Menit/Sesi
                    </small>
                  </div>
                )}
                <div className="input-group">
                  <label>Status:</label>
                  <select
                    value={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: e.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">✅ Aktif</option>
                    <option value="false">❌ Nonaktif</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="generate-btn"
                >
                  {loading && <span className="loading"></span>}➕ Tambah
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    clearImageSelection();
                    setImageInputType("url");
                    setUploadingImage(false);
                    setFormData({
                      name: "",
                      category: "studio",
                      price: "",
                      stock: "",
                      image_url: "",
                      duration: "",
                      is_active: true,
                    });
                  }}
                  style={{
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "5px",
                  }}
                >
                  ❌ Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingItem && user.role === "admin" ? (
          <div
            onClick={handleBackdropClick}
            style={{
              position: "fixed",
              top: "0px",
              left: "0px",
              right: "0px",
              bottom: "0px",
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: "9999",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflow: "auto",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                position: "relative",
                border: "2px solid #e0e0e0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{ margin: "0", color: "#2c3e50", fontSize: "1.3rem" }}
                >
                  ✏️ Edit Item: {editingItem?.name || "Unknown"}
                </h3>
                <button
                  onClick={cancelEdit}
                  style={{
                    background: "#f0f0f0",
                    border: "1px solid #ccc",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "50%",
                    color: "#7f8c8d",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateItem}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Nama Item:
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Masukkan nama item..."
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Kategori:
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      {Object.entries(categories).map(([key, cat]) => (
                        <option key={key} value={key}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Harga (Rp):
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min="0"
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  {!isUnlimitedStock(formData.category) && (
                    <div style={{ marginBottom: "12px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Stock:
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            stock: e.target.value,
                          }))
                        }
                        placeholder="0"
                        min="0"
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ marginBottom: "12px", gridColumn: "span 2" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      Gambar Item:
                    </label>

                    {/* Toggle buttons for input type */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => switchImageInputType("url")}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          backgroundColor:
                            imageInputType === "url" ? "#3498db" : "#f8f9fa",
                          color: imageInputType === "url" ? "white" : "#495057",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        🔗 URL Link
                      </button>
                      <button
                        type="button"
                        onClick={() => switchImageInputType("upload")}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          backgroundColor:
                            imageInputType === "upload" ? "#3498db" : "#f8f9fa",
                          color:
                            imageInputType === "upload" ? "white" : "#495057",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        📁 Upload File
                      </button>
                    </div>

                    {/* URL Input */}
                    {imageInputType === "url" && (
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            image_url: e.target.value,
                          }))
                        }
                        placeholder="https://example.com/image.jpg"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    )}

                    {/* File Upload Input */}
                    {imageInputType === "upload" && (
                      <div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleFileSelect}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "2px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            marginBottom: "8px",
                          }}
                        />
                        {uploadingImage && (
                          <div
                            style={{
                              color: "#3498db",
                              fontSize: "0.8rem",
                              marginBottom: "8px",
                            }}
                          >
                            📤 Mengupload gambar...
                          </div>
                        )}
                        {selectedFile && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#27ae60",
                              marginBottom: "8px",
                            }}
                          >
                            ✅ File terpilih: {selectedFile.name}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Image Preview */}
                    {(imagePreview || formData.image_url) && (
                      <div style={{ marginTop: "8px" }}>
                        <img
                          src={imagePreview || formData.image_url}
                          alt="Preview"
                          style={{
                            width: "150px",
                            height: "112px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "2px solid #ddd",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={clearImageSelection}
                          style={{
                            marginLeft: "12px",
                            padding: "6px 12px",
                            backgroundColor: "#e74c3c",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          ❌ Hapus
                        </button>
                      </div>
                    )}

                    <small
                      style={{
                        color: "#7f8c8d",
                        fontSize: "0.75rem",
                        display: "block",
                        marginTop: "4px",
                      }}
                    >
                      🖼️ Rasio yang disarankan: 4:3 (landscape) - contoh:
                      280x200px. Format: JPG, PNG, GIF, WebP (max 10MB)
                    </small>
                  </div>
                  {formData.category === "studio" && (
                    <div style={{ marginBottom: "12px", gridColumn: "span 2" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Durasi Layanan:
                      </label>
                      <input
                        type="text"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            duration: e.target.value,
                          }))
                        }
                        placeholder="60Menit/Sesi"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                      <small
                        style={{
                          color: "#7f8c8d",
                          fontSize: "0.75rem",
                          display: "block",
                          marginTop: "4px",
                        }}
                      >
                        ⏱️ Contoh: 30Menit/Sesi, 1Jam/Sesi, 90Menit/Sesi
                      </small>
                    </div>
                  )}
                  <div style={{ marginBottom: "12px", gridColumn: "span 2" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Status:
                    </label>
                    <select
                      value={formData.is_active}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_active: e.target.value === "true",
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="true">✅ Aktif</option>
                      <option value="false">❌ Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{
                      background: "#6c757d",
                      color: "white",
                      border: "none",
                      padding: "12px 20px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ❌ Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: loading ? "#95a5a6" : "#3498db",
                      color: "white",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "6px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {loading && (
                      <span
                        className="loading"
                        style={{ width: "16px", height: "16px" }}
                      ></span>
                    )}
                    💾 Update & Tutup
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Items Grid */}
        <div className="history-section">
          {loading ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#7f8c8d" }}
            >
              <div className="loading" style={{ margin: "0 auto 20px" }}></div>
              <p>Memuat data stok...</p>
            </div>
          ) : items.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#7f8c8d" }}
            >
              <p style={{ fontSize: "3rem", marginBottom: "20px" }}>📦</p>
              <p style={{ fontSize: "1.2rem" }}>Belum ada item tersimpan</p>
            </div>
          ) : (
            <div style={{ display: "block" }}>
              {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
                const categoryItems = items.filter(
                  (item) => item.category === categoryKey
                );
                if (categoryItems.length === 0) return null;

                return (
                  <div key={categoryKey} style={{ marginBottom: "30px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "20px",
                        padding: "15px",
                        background: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          backgroundColor: categoryInfo.color,
                        }}
                      >
                        <span style={{ fontSize: "1.5rem" }}>
                          {categoryInfo.icon}
                        </span>
                      </div>
                      <div>
                        <h3
                          style={{
                            color: "#2c3e50",
                            margin: "0",
                            fontSize: "1.3rem",
                            fontWeight: "bold",
                          }}
                        >
                          {categoryInfo.name}
                        </h3>
                        <p
                          style={{
                            color: "#7f8c8d",
                            margin: "0",
                            fontSize: "0.9rem",
                          }}
                        >
                          {categoryItems.length} item
                        </p>
                      </div>
                    </div>

                    <div style={gridStyle}>
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleCardClick(item.id)}
                          style={{
                            ...(selectedCard === item.id
                              ? selectedCardStyle
                              : cardStyle),
                            backgroundColor: categoryInfo.color,
                          }}
                        >
                          {selectedCard === item.id && user.role === "admin" ? (
                            /* Mode Edit/Hapus/Aktifkan */
                            <div
                              style={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                gap: "8px",
                              }}
                            >
                              <h4
                                style={{
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                  margin: "0 0 8px 0",
                                  color: "#2c3e50",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.name}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(item);
                                }}
                                style={{
                                  width: "100%",
                                  backgroundColor: "#3498db",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                }}
                              >
                                ✏️ Edit
                              </button>
                              {item.is_active ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item);
                                  }}
                                  style={{
                                    width: "100%",
                                    backgroundColor: "#e74c3c",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  ⚠️ Nonaktifkan
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivateItem(item);
                                  }}
                                  style={{
                                    width: "100%",
                                    backgroundColor: "#27ae60",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✅ Aktifkan
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Mode Info Dasar */
                            <div
                              style={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                              }}
                            >
                              <div
                                style={{
                                  textAlign: "center",
                                  marginBottom: "6px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "1.8rem",
                                    marginBottom: "3px",
                                  }}
                                >
                                  {categoryInfo.icon}
                                </div>
                                <h4
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: "bold",
                                    margin: "0",
                                    color: "#2c3e50",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    lineHeight: "1.1",
                                  }}
                                >
                                  {item.name}
                                </h4>
                              </div>

                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  marginBottom: "6px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "3px",
                                  }}
                                >
                                  <span
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: "3px",
                                      backgroundColor: item.is_active
                                        ? "#27ae60"
                                        : "#e74c3c",
                                      color: "white",
                                      fontSize: "0.65rem",
                                    }}
                                  >
                                    {item.is_active ? "Aktif" : "Off"}
                                  </span>
                                  <span
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: "3px",
                                      fontSize: "0.65rem",
                                      fontWeight: "bold",
                                      backgroundColor: getStockColor(item),
                                      color: "white",
                                    }}
                                  >
                                    {getStockDisplay(item)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    textAlign: "center",
                                    fontWeight: "bold",
                                    color: "#2c3e50",
                                    fontSize: "0.75rem",
                                    marginBottom: "6px",
                                  }}
                                >
                                  Rp {formatRupiah(item.price)}
                                </div>
                              </div>

                              {user.role === "admin" && (
                                <div
                                  style={{
                                    paddingTop: "3px",
                                    borderTop: "1px solid rgba(0,0,0,0.15)",
                                    marginTop: "auto",
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: "0.65rem",
                                      color: "#7f8c8d",
                                      margin: "0",
                                      textAlign: "center",
                                      lineHeight: "1",
                                    }}
                                  >
                                    Klik untuk edit
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stok;
