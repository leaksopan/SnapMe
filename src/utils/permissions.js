import { supabase } from "../supabaseClient";

// Load user permissions from database with timeout
export const loadUserPermissions = async (userId) => {
  try {
    console.log("🔄 Loading permissions for user ID:", userId);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Permission loading timeout")), 5000);
    });

    const queryPromise = supabase
      .from("user_permissions")
      .select("module_name, has_access")
      .eq("user_id", userId);

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    console.log("📋 Raw permission data:", data);

    // Convert to object for easy access
    const permissions = {};
    if (data && Array.isArray(data)) {
      data.forEach((permission) => {
        permissions[permission.module_name] = permission.has_access;
      });
    }

    console.log("✅ Processed permissions:", permissions);
    return permissions;
  } catch (error) {
    console.error("❌ Error loading user permissions:", error);

    // Return empty object as fallback
    return {};
  }
};

// Check if user has access to a specific module
export const hasModuleAccess = (user, userPermissions = {}, moduleName) => {
  // Safety check
  if (!user) return false;

  // Kasir module is always accessible
  if (moduleName === "kasir") {
    return true;
  }

  // Karyawan module is admin-only
  if (moduleName === "karyawan") {
    return user.role === "admin";
  }

  // For customizable modules (dashboard, history, stok, reservasi, claim_photo)
  if (
    ["dashboard", "history", "stok", "reservasi", "claim_photo"].includes(
      moduleName
    )
  ) {
    // Admin gets access based on their permissions (can be customized)
    if (user.role === "admin") {
      // Default to true if permission not set for admin
      return userPermissions[moduleName] !== false;
    }

    // Kasir gets access based on permissions only
    return userPermissions[moduleName] === true;
  }

  // Default deny for unknown modules
  return false;
};

// Get available pages for user based on permissions
export const getAvailablePages = (user, userPermissions = {}) => {
  // Safety check
  if (!user) return [];

  const allPages = [
    {
      key: "kasir",
      name: "Kasir",
      icon: "wallet",
      description: "Transaksi Penjualan",
    },
    {
      key: "dashboard",
      name: "Dashboard",
      icon: "chart",
      description: "Analytics & Monitoring",
    },
    {
      key: "history",
      name: "Riwayat",
      icon: "history",
      description: "Riwayat Transaksi",
    },
    {
      key: "stok",
      name: "Produk",
      icon: "package",
      description: "Manajemen Stok",
    },
    {
      key: "reservasi",
      name: "Reservasi Online",
      icon: "calendar",
      description: "Manajemen Reservasi",
    },
    {
      key: "claim_photo",
      name: "Claim Photo",
      icon: "camera",
      description: "Klaim Foto Pelanggan",
    },
    {
      key: "karyawan",
      name: "Karyawan",
      icon: "users",
      description: "Manajemen Karyawan",
      adminOnly: true,
    },
  ];

  return allPages.filter((page) => {
    // Admin-only pages
    if (page.adminOnly && user.role !== "admin") {
      return false;
    }

    // Check module access
    return hasModuleAccess(user, userPermissions, page.key);
  });
};
