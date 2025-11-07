import React, { useState, lazy, Suspense, useEffect } from "react";
import "./App.css";
import { loadUserPermissions, hasModuleAccess } from "./utils/permissions";

// Import page components - lazy load untuk optimasi
import Login from "./pages/Login";
import Kasir from "./pages/Kasir";
import Navigation from "./components/Navigation";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const History = lazy(() => import("./pages/History"));
const Stok = lazy(() => import("./pages/Stok"));
const Reservasi = lazy(() => import("./pages/Reservasi"));
const ClaimPhoto = lazy(() => import("./pages/ClaimPhoto"));
const Karyawan = lazy(() => import("./pages/Karyawan"));

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("kasir");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userPermissions, setUserPermissions] = useState({});

  // Update document title berdasarkan halaman aktif
  useEffect(() => {
    const pageTitle = {
      kasir: "Kasir - SnapMe",
      dashboard: "Dashboard - SnapMe",
      history: "Riwayat Transaksi - SnapMe",
      stok: "Manajemen Stok - SnapMe",
      reservasi: "Reservasi Online - SnapMe",
      claim_photo: "Claim Photo - SnapMe",
      karyawan: "Manajemen Karyawan - SnapMe",
    };

    document.title = user
      ? pageTitle[currentPage] || "Kasir SnapMe"
      : "Login - SnapMe";
  }, [currentPage, user]);

  // Load user permissions when user logs in
  useEffect(() => {
    const loadPermissions = async () => {
      if (user && user.id) {
        try {
          console.log("🔄 Loading permissions for user:", user.id);
          const permissions = await loadUserPermissions(user.id);
          console.log("✅ Permissions loaded:", permissions);
          setUserPermissions(permissions);
        } catch (error) {
          console.error("❌ Failed to load permissions:", error);
          // Set empty permissions as fallback
          setUserPermissions({});
        }
      }
    };

    loadPermissions();
  }, [user]);

  // Handle login
  const handleLogin = async (userData) => {
    setUser(userData);
  };

  // Handle logout
  const handleLogout = async () => {
    setUser(null);
    setCurrentPage("kasir");
    setUserPermissions({});
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    // Check if user has access to the current page
    const hasAccess = hasModuleAccess(user, userPermissions, currentPage);

    if (!hasAccess) {
      // Redirect to kasir if no access
      if (currentPage !== "kasir") {
        setCurrentPage("kasir");
      }
      return <Kasir user={user} onLogout={handleLogout} />;
    }

    let pageComponent;
    switch (currentPage) {
      case "kasir":
        pageComponent = <Kasir user={user} onLogout={handleLogout} />;
        break;
      case "dashboard":
        pageComponent = (
          <Suspense
            fallback={
              <div style={{ textAlign: "center", padding: "50px" }}>
                ⏳ Memuat dashboard...
              </div>
            }
          >
            <Dashboard user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      case "history":
        pageComponent = (
          <Suspense
            fallback={
              <div style={{ textAlign: "center", padding: "50px" }}>
                ⏳ Memuat halaman...
              </div>
            }
          >
            <History user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      case "stok":
        pageComponent = (
          <Suspense
            fallback={
              <div style={{ textAlign: "center", padding: "50px" }}>
                ⏳ Memuat halaman...
              </div>
            }
          >
            <Stok user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      case "reservasi":
        pageComponent = (
          <Suspense
            fallback={
              <div style={{ textAlign: "center", padding: "50px" }}>
                ⏳ Memuat halaman...
              </div>
            }
          >
            <Reservasi user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      case "claim_photo":
        pageComponent = (
          <Suspense
            fallback={
              <div style={{ textAlign: "center", padding: "50px" }}>
                ⏳ Memuat halaman...
              </div>
            }
          >
            <ClaimPhoto user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      case "karyawan":
        pageComponent = (
          <Suspense
            fallback={
              <div style={{ textAlign: "center", padding: "50px" }}>
                ⏳ Memuat halaman...
              </div>
            }
          >
            <Karyawan user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      default:
        pageComponent = <Kasir user={user} onLogout={handleLogout} />;
    }

    return pageComponent;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
        userPermissions={userPermissions}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLogout={handleLogout}
      />
      <div
        style={{
          marginLeft: sidebarOpen ? "280px" : "70px",
          width: "100%",
          transition: "margin-left 0.3s ease",
        }}
      >
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
