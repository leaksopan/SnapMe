import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";

const Karyawan = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUserForPermission, setSelectedUserForPermission] = useState(
    null
  );
  const [formData, setFormData] = useState({
    username: "",
    password_hash: "",
    full_name: "",
    role: "kasir",
    is_active: true,
  });

  // Debouncing state for username checking
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // Modul yang bisa di-custom permission
  const customizableModules = [
    {
      key: "dashboard",
      name: "Dashboard",
      icon: "📊",
      description: "Analytics & Monitoring",
    },
    {
      key: "history",
      name: "Riwayat",
      icon: "📋",
      description: "Riwayat Transaksi",
    },
    { key: "stok", name: "Stok", icon: "📦", description: "Manajemen Stok" },
  ];

  // Get current date
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Load user permissions
  const loadUserPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*");

      if (error) throw error;

      // Organize permissions by user_id
      const permissionsByUser = {};
      data.forEach((permission) => {
        if (!permissionsByUser[permission.user_id]) {
          permissionsByUser[permission.user_id] = {};
        }
        permissionsByUser[permission.user_id][permission.module_name] =
          permission.has_access;
      });

      setUserPermissions(permissionsByUser);
    } catch (error) {
      console.error("❌ Error loading user permissions:", error);
    }
  }, []);

  // Load users from users table with optimized performance
  const loadUsers = useCallback(async () => {
    console.log("👥 Loading users...");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("role", { ascending: true })
        .order("full_name", { ascending: true });

      if (error) {
        console.error("❌ Error loading users:", error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} users successfully`);
      setUsers(data || []);

      // Load permissions after users
      await loadUserPermissions();
    } catch (error) {
      console.error("❌ Error loading users:", error);
      alert("Gagal memuat data karyawan: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [loadUserPermissions]);

  // Create default permissions for new user
  const createDefaultPermissions = async (userId, role) => {
    try {
      const defaultPermissions = customizableModules.map((module) => ({
        user_id: userId,
        module_name: module.key,
        has_access: role === "admin", // Admin gets all access by default
      }));

      const { error } = await supabase
        .from("user_permissions")
        .insert(defaultPermissions);

      if (error) throw error;
    } catch (error) {
      console.error("❌ Error creating default permissions:", error);
    }
  };

  // Update user permission
  const updateUserPermission = async (userId, moduleName, hasAccess) => {
    try {
      const { error } = await supabase.from("user_permissions").upsert(
        {
          user_id: userId,
          module_name: moduleName,
          has_access: hasAccess,
        },
        {
          onConflict: "user_id,module_name",
        }
      );

      if (error) throw error;

      // Update local state
      setUserPermissions((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [moduleName]: hasAccess,
        },
      }));

      console.log(
        `✅ Permission ${moduleName} for user ${userId} updated to ${hasAccess}`
      );
    } catch (error) {
      console.error("❌ Error updating permission:", error);
      alert("Gagal mengupdate permission: " + error.message);
    }
  };

  // Debounced username check function
  const checkUsernameAvailability = useCallback(
    async (username) => {
      if (!username || username.length < 3) {
        setUsernameError("");
        return;
      }

      setUsernameCheckLoading(true);
      setUsernameError("");

      try {
        const { data: existingUsers, error } = await supabase
          .from("users")
          .select("username")
          .eq("username", username);

        if (error) {
          console.error("❌ Error checking username:", error);
          return;
        }

        if (existingUsers && existingUsers.length > 0) {
          // Check if it's the current editing user
          if (
            editingUser &&
            existingUsers[0].username === editingUser.username
          ) {
            setUsernameError("");
          } else {
            setUsernameError("Username sudah digunakan");
          }
        } else {
          setUsernameError("");
        }
      } catch (error) {
        console.error("❌ Username check failed:", error);
      } finally {
        setUsernameCheckLoading(false);
      }
    },
    [editingUser]
  );

  // Debounce effect for username
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.username) {
        checkUsernameAvailability(formData.username);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [formData.username, checkUsernameAvailability]);

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (user.role !== "admin") {
      alert("Hanya admin yang dapat menambah karyawan");
      return;
    }

    // Check username error before proceeding
    if (usernameError) {
      alert(usernameError);
      return;
    }

    setLoading(true);
    try {
      console.log("✅ Creating user with validated username...");

      // Insert new user (username already validated by debounced check)
      const { data: newUserData, error } = await supabase
        .from("users")
        .insert([
          {
            username: formData.username,
            password_hash: formData.password_hash,
            full_name: formData.full_name,
            role: formData.role,
            is_active: formData.is_active,
          },
        ])
        .select();

      if (error) throw error;

      // Create default permissions for new user
      if (newUserData && newUserData[0]) {
        await createDefaultPermissions(newUserData[0].id, formData.role);
      }

      setFormData({
        username: "",
        password_hash: "",
        full_name: "",
        role: "kasir",
        is_active: true,
      });
      setUsernameError("");
      setShowAddForm(false);
      await loadUsers();
      alert("Karyawan berhasil ditambahkan");
    } catch (error) {
      console.error("❌ Error adding user:", error);
      alert("Gagal menambah karyawan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (user.role !== "admin") {
      alert("Hanya admin yang dapat mengupdate karyawan");
      return;
    }

    // Check username error before proceeding (unless it's the same username)
    if (usernameError && formData.username !== editingUser?.username) {
      alert(usernameError);
      return;
    }

    setLoading(true);
    try {
      console.log("✅ Updating user with validated data...");

      // Prepare update data
      const updateData = {
        username: formData.username,
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active,
      };

      // Only update password if provided
      if (formData.password_hash) {
        updateData.password_hash = formData.password_hash;
      }

      // Update user
      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", editingUser.id);

      if (error) throw error;

      setEditingUser(null);
      setFormData({
        username: "",
        password_hash: "",
        full_name: "",
        role: "kasir",
        is_active: true,
      });
      setUsernameError("");
      await loadUsers();
      alert("Karyawan berhasil diupdate");
    } catch (error) {
      console.error("❌ Error updating user:", error);
      alert("Gagal mengupdate karyawan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userToDelete) => {
    if (user.role !== "admin") {
      alert("Hanya admin yang dapat menghapus karyawan");
      return;
    }

    if (userToDelete.id === user.id) {
      alert("Anda tidak dapat menghapus akun sendiri");
      return;
    }

    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus karyawan "${userToDelete.full_name}"?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userToDelete.id);

      if (error) throw error;

      await loadUsers();
      alert("Karyawan berhasil dihapus");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Gagal menghapus karyawan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const startEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.username,
      password_hash: "", // Don't prefill password
      full_name: userToEdit.full_name,
      role: userToEdit.role,
      is_active: userToEdit.is_active,
    });
    setShowAddForm(false);
    setShowEditModal(true);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingUser(null);
    setShowEditModal(false);
    // Reset overflow untuk mengembalikan scroll
    document.body.style.overflow = "unset";
    setFormData({
      username: "",
      password_hash: "",
      full_name: "",
      role: "kasir",
      is_active: true,
    });
    setUsernameError("");
    setUsernameCheckLoading(false);
  };

  // Handle permission management
  const openPermissionModal = (userToManage) => {
    setSelectedUserForPermission(userToManage);
    setShowPermissionModal(true);
  };

  const closePermissionModal = () => {
    setSelectedUserForPermission(null);
    setShowPermissionModal(false);
  };

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  const roles = {
    admin: { name: "Administrator", icon: "👑", color: "#e74c3c" },
    kasir: { name: "Kasir", icon: "👨‍💼", color: "#3498db" },
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>👥 Manajemen Karyawan</h1>
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

        <div
          className="tools"
          style={{
            marginBottom: "20px",
            padding: "20px",
            background: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <button onClick={loadUsers} disabled={loading}>
            🔄 {loading ? "Memuat..." : "Refresh Data"}
          </button>
          {user.role === "admin" && (
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingUser(null);
                setShowEditModal(false);
                cancelEdit();
              }}
              style={{ backgroundColor: showAddForm ? "#e74c3c" : "#27ae60" }}
            >
              {showAddForm ? "❌ Batal" : "➕ Tambah Karyawan"}
            </button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div
            style={{
              marginBottom: "20px",
              padding: "20px",
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h3>➕ Tambah Karyawan Baru</h3>
            <form onSubmit={handleAddUser}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "15px",
                }}
              >
                <div className="input-group">
                  <label>Username:</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      placeholder="Masukkan username..."
                      required
                      style={{
                        border: usernameError
                          ? "2px solid #e74c3c"
                          : "1px solid #ddd",
                        paddingRight: usernameCheckLoading ? "35px" : "10px",
                      }}
                    />
                    {usernameCheckLoading && (
                      <div
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "16px",
                          height: "16px",
                          border: "2px solid #3498db",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      ></div>
                    )}
                  </div>
                  {usernameError && (
                    <div
                      style={{
                        color: "#e74c3c",
                        fontSize: "0.8rem",
                        marginTop: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ❌ {usernameError}
                    </div>
                  )}
                  {formData.username &&
                    !usernameError &&
                    !usernameCheckLoading &&
                    formData.username.length >= 3 && (
                      <div
                        style={{
                          color: "#27ae60",
                          fontSize: "0.8rem",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ✅ Username tersedia
                      </div>
                    )}
                </div>
                <div className="input-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={formData.password_hash}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password_hash: e.target.value,
                      }))
                    }
                    placeholder="Masukkan password..."
                    required
                    minLength="6"
                  />
                </div>
                <div className="input-group">
                  <label>Nama Lengkap:</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="Masukkan nama lengkap..."
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Role:</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    required
                  >
                    <option value="kasir">Kasir</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
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
                    required
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="generate-btn"
                >
                  {loading ? "⏳ Menyimpan..." : "➕ Tambah"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    cancelEdit();
                  }}
                  style={{ background: "#95a5a6", color: "white" }}
                >
                  ❌ Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingUser && user.role === "admin" ? (
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
                  ✏️ Edit Karyawan: {editingUser?.full_name || "Unknown"}
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

              <form onSubmit={handleUpdateUser}>
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
                      Username:
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        placeholder="Masukkan username..."
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: usernameError
                            ? "2px solid #e74c3c"
                            : "2px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          paddingRight: usernameCheckLoading ? "40px" : "12px",
                        }}
                      />
                      {usernameCheckLoading && (
                        <div
                          style={{
                            position: "absolute",
                            right: "15px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "16px",
                            height: "16px",
                            border: "2px solid #3498db",
                            borderTop: "2px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        ></div>
                      )}
                    </div>
                    {usernameError && (
                      <div
                        style={{
                          color: "#e74c3c",
                          fontSize: "0.8rem",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ❌ {usernameError}
                      </div>
                    )}
                    {formData.username &&
                      !usernameError &&
                      !usernameCheckLoading &&
                      formData.username.length >= 3 && (
                        <div
                          style={{
                            color: "#27ae60",
                            fontSize: "0.8rem",
                            marginTop: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          ✅ Username tersedia
                        </div>
                      )}
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Password:
                    </label>
                    <input
                      type="password"
                      value={formData.password_hash}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password_hash: e.target.value,
                        }))
                      }
                      placeholder="Kosongkan jika tidak ingin ubah..."
                      minLength="6"
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
                      Nama Lengkap:
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          full_name: e.target.value,
                        }))
                      }
                      placeholder="Masukkan nama lengkap..."
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
                      Role:
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "2px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="kasir">Kasir</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
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
                      required
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

        {/* Users List */}
        <div className="main-content">
          {loading && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              ⏳ Memuat data...
            </div>
          )}

          {!loading && users.length === 0 && (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#7f8c8d" }}
            >
              <h3>Belum ada data karyawan</h3>
              <p>Klik tombol "Tambah Karyawan" untuk menambah data</p>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div>
              {Object.entries(roles).map(([roleKey, roleInfo]) => {
                const roleUsers = users.filter((u) => u.role === roleKey);

                return (
                  <div key={roleKey} style={{ marginBottom: "30px" }}>
                    <h3 style={{ color: roleInfo.color, marginBottom: "15px" }}>
                      {roleInfo.icon} {roleInfo.name} ({roleUsers.length})
                    </h3>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {roleUsers.map((userItem) => (
                        <div
                          key={userItem.id}
                          className="history-card"
                          style={{ padding: "15px" }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(150px, 1fr))",
                              gap: "10px",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <strong
                                style={{
                                  color: userItem.is_active
                                    ? "#2c3e50"
                                    : "#7f8c8d",
                                }}
                              >
                                {userItem.full_name}
                              </strong>
                              <div
                                style={{ fontSize: "0.9rem", color: "#7f8c8d" }}
                              >
                                @{userItem.username}
                              </div>
                            </div>
                            <div>
                              <span
                                style={{
                                  background: roleInfo.color,
                                  color: "white",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {roleInfo.icon} {roleInfo.name}
                              </span>
                            </div>
                            <div>
                              <span
                                style={{
                                  color: userItem.is_active
                                    ? "#27ae60"
                                    : "#e74c3c",
                                  fontWeight: "600",
                                }}
                              >
                                {userItem.is_active
                                  ? "✅ Aktif"
                                  : "❌ Nonaktif"}
                              </span>
                            </div>
                            <div>
                              <span
                                style={{ fontSize: "0.8rem", color: "#7f8c8d" }}
                              >
                                📅 Dibuat:{" "}
                                {new Date(
                                  userItem.created_at
                                ).toLocaleDateString("id-ID")}
                              </span>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#7f8c8d",
                                  marginBottom: "4px",
                                }}
                              >
                                🔐 <strong>Akses Modul:</strong>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "4px",
                                }}
                              >
                                {/* Kasir - always accessible */}
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "8px",
                                    background: "#27ae60",
                                    color: "white",
                                  }}
                                >
                                  💳 Kasir
                                </span>

                                {/* Customizable modules */}
                                {customizableModules.map((module) => {
                                  const hasAccess =
                                    userPermissions[userItem.id]?.[
                                      module.key
                                    ] || false;
                                  if (!hasAccess) return null;

                                  return (
                                    <span
                                      key={module.key}
                                      style={{
                                        fontSize: "0.7rem",
                                        padding: "2px 6px",
                                        borderRadius: "8px",
                                        background: "#3498db",
                                        color: "white",
                                      }}
                                    >
                                      {module.icon} {module.name}
                                    </span>
                                  );
                                })}

                                {/* Karyawan - admin only */}
                                {userItem.role === "admin" && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      padding: "2px 6px",
                                      borderRadius: "8px",
                                      background: "#e74c3c",
                                      color: "white",
                                    }}
                                  >
                                    👥 Karyawan
                                  </span>
                                )}
                              </div>
                            </div>
                            {user.role === "admin" && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "5px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  onClick={() => startEdit(userItem)}
                                  style={{
                                    background: "#3498db",
                                    color: "white",
                                    border: "none",
                                    padding: "5px 10px",
                                    borderRadius: "3px",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => openPermissionModal(userItem)}
                                  style={{
                                    background: "#8e44ad",
                                    color: "white",
                                    border: "none",
                                    padding: "5px 10px",
                                    borderRadius: "3px",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  🔐 Permission
                                </button>
                                {userItem.id !== user.id && (
                                  <button
                                    onClick={() => handleDeleteUser(userItem)}
                                    style={{
                                      background: "#e74c3c",
                                      color: "white",
                                      border: "none",
                                      padding: "5px 10px",
                                      borderRadius: "3px",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    🗑️ Hapus
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permission Management Modal */}
        {showPermissionModal && selectedUserForPermission && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "10px",
                width: "500px",
                maxWidth: "90%",
                maxHeight: "80%",
                overflow: "auto",
              }}
            >
              <h3 style={{ marginBottom: "20px", color: "#2c3e50" }}>
                🔐 Atur Permission untuk: {selectedUserForPermission.full_name}
              </h3>

              <div
                style={{
                  marginBottom: "20px",
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                }}
              >
                <div style={{ fontSize: "0.9rem", color: "#7f8c8d" }}>
                  <strong>Username:</strong>{" "}
                  {selectedUserForPermission.username}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#7f8c8d" }}>
                  <strong>Role:</strong>{" "}
                  {selectedUserForPermission.role === "admin"
                    ? "👑 Administrator"
                    : "👨‍💼 Kasir"}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ marginBottom: "15px", color: "#34495e" }}>
                  Akses Modul:
                </h4>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#7f8c8d",
                    marginBottom: "15px",
                  }}
                >
                  💳 <strong>Kasir:</strong> Selalu dapat diakses oleh semua
                  user
                  <br />
                  👥 <strong>Karyawan:</strong> Hanya dapat diakses oleh
                  Administrator
                </div>

                {customizableModules.map((module) => {
                  const currentPermission =
                    userPermissions[selectedUserForPermission.id]?.[
                      module.key
                    ] || false;

                  return (
                    <div
                      key={module.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        background: currentPermission ? "#d5f4e6" : "#fff",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                          {module.icon} {module.name}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#7f8c8d" }}>
                          {module.description}
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={currentPermission}
                          onChange={(e) =>
                            updateUserPermission(
                              selectedUserForPermission.id,
                              module.key,
                              e.target.checked
                            )
                          }
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: currentPermission ? "#27ae60" : "#e74c3c",
                          }}
                        >
                          {currentPermission
                            ? "✅ Dapat Akses"
                            : "❌ Tidak Dapat Akses"}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={closePermissionModal}
                  style={{
                    background: "#95a5a6",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  ✅ Selesai
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Karyawan;
