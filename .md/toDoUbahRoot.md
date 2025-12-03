# 📋 TODO: Ubah Root Flow - Landing Page sebagai Default

## 🎯 Overview
Mengubah struktur aplikasi:
- **Default Route (`/`)**: Landing Page (public)
- **Admin Routes (`/admin/*`)**: Protected routes untuk kasir/admin
- **Landing Routes**: `/`, `/gallery`, `/claim-photo`, `/booking`
- **Dual Auth System**: 
  - Kasir/Admin → Custom auth (tabel users) - tetap pakai yang sekarang
  - Customer/Booking → Supabase Auth (Google login)

---

## 📦 PHASE 1: Install Dependencies

### 1.1 Install React Router
- [ ] Install React Router DOM:
  ```bash
  npm install react-router-dom
  ```

### 1.2 Update Supabase Client untuk Dual Auth
- [ ] Update `src/supabaseClient.js`:
  - [ ] Aktifkan Supabase Auth untuk customer/booking
  - [ ] Tetap support custom auth untuk admin
  - [ ] Buat 2 client instances atau conditional config

---

## 🏗️ PHASE 2: Update Supabase Client Configuration

### 2.1 Update supabaseClient.js
- [ ] Buat dual client configuration:
  ```js
  import { createClient } from '@supabase/supabase-js'
  
  const supabaseUrl = 'https://auzfgedsysmqnpryudcg.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  
  // Client untuk admin (custom auth - nonaktifkan Supabase Auth)
  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    realtime: {
      heartbeatIntervalMs: 30000
    }
  })
  
  // Client untuk customer (Supabase Auth enabled)
  export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      heartbeatIntervalMs: 30000
    }
  })
  ```

### 2.2 Enable Supabase Auth Providers
- [ ] Di Supabase Dashboard → Authentication → Providers:
  - [ ] Enable Google Provider
  - [ ] Configure Google OAuth credentials
  - [ ] Set redirect URLs

---

## 🔧 PHASE 3: Create Router Structure

### 3.1 Create Router Component
- [ ] Buat `src/router/AppRouter.js`:
  ```js
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
  import { lazy, Suspense } from 'react';
  
  // Landing Pages (Public)
  const Landing = lazy(() => import('../pages/Landing'));
  const LandingGallery = lazy(() => import('../pages/LandingGallery'));
  const LandingClaimPhoto = lazy(() => import('../pages/LandingClaimPhoto'));
  const Booking = lazy(() => import('../pages/Booking'));
  
  // Admin Pages (Protected)
  const AdminLogin = lazy(() => import('../pages/AdminLogin'));
  const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
  
  // Protected Route Wrapper
  const ProtectedRoute = ({ children, user }) => {
    if (!user) {
      return <Navigate to="/admin/login" replace />;
    }
    return children;
  };
  
  const AppRouter = () => {
    const [adminUser, setAdminUser] = useState(null);
    
    // Load admin session from localStorage (custom auth)
    useEffect(() => {
      const savedUser = localStorage.getItem('admin_user');
      if (savedUser) {
        try {
          setAdminUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('admin_user');
        }
      }
    }, []);
    
    return (
      <BrowserRouter>
        <Routes>
          {/* Public Landing Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/gallery" element={<LandingGallery />} />
          <Route path="/claim-photo" element={<LandingClaimPhoto />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/:packageId" element={<Booking />} />
          
          {/* Admin Routes */}
          <Route 
            path="/admin/login" 
            element={
              adminUser ? (
                <Navigate to="/admin/kasir" replace />
              ) : (
                <AdminLogin onLogin={setAdminUser} />
              )
            } 
          />
          
          {/* Protected Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute user={adminUser}>
                <AdminDashboard user={adminUser} onLogout={() => {
                  setAdminUser(null);
                  localStorage.removeItem('admin_user');
                }} />
              </ProtectedRoute>
            }
          />
          
          {/* Catch all - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  };
  
  export default AppRouter;
  ```

### 3.2 Update App.js
- [ ] Update `src/App.js`:
  - [ ] Import AppRouter
  - [ ] Replace current routing dengan AppRouter
  - [ ] Remove direct Login check
  - [ ] Keep admin dashboard logic di AdminDashboard component

---

## 📄 PHASE 4: Create Landing Pages

### 4.1 Landing Page (Home)
- [ ] Buat `src/pages/Landing.js`:
  - [ ] Import LandingNav, AnnounceBanner, PackageGrid, FloatingContactButton
  - [ ] Layout sesuai TODO Landing Page
  - [ ] Footer dengan tombol "Masuk ke Kasir" → link ke `/admin/login`

### 4.2 Landing Gallery Page
- [ ] Buat `src/pages/LandingGallery.js`:
  - [ ] Gallery dengan filter
  - [ ] Footer dengan tombol "Masuk ke Kasir"

### 4.3 Landing Claim Photo Page
- [ ] Buat `src/pages/LandingClaimPhoto.js`:
  - [ ] Search interface untuk claim photo
  - [ ] Footer dengan tombol "Masuk ke Kasir"

### 4.4 Booking Page
- [ ] Buat `src/pages/Booking.js`:
  - [ ] Booking flow dengan Supabase Auth
  - [ ] Google login untuk customer
  - [ ] Protected route jika perlu login

---

## 🔐 PHASE 5: Admin Authentication (Custom Auth)

### 5.1 Create AdminLogin Page
- [ ] Buat `src/pages/AdminLogin.js`:
  - [ ] Copy logic dari `src/pages/Login.js`
  - [ ] Update untuk save session ke localStorage
  - [ ] Redirect ke `/admin/kasir` setelah login
  - [ ] Styling sesuai branding

### 5.2 Create AdminDashboard Component
- [ ] Buat `src/pages/AdminDashboard.js`:
  - [ ] Move logic dari `App.js` ke sini
  - [ ] Handle routing untuk admin pages:
    - `/admin/kasir` → Kasir
    - `/admin/dashboard` → Dashboard
    - `/admin/history` → History
    - `/admin/stok` → Stok
    - `/admin/reservasi` → Reservasi
    - `/admin/claim-photo` → Claim Photo (admin)
    - `/admin/karyawan` → Karyawan
  - [ ] Keep Navigation sidebar
  - [ ] Handle logout → clear localStorage & redirect ke `/admin/login`

### 5.3 Update Session Management
- [ ] Update login handler untuk save ke localStorage:
  ```js
  const handleAdminLogin = async (userData) => {
    localStorage.setItem('admin_user', JSON.stringify(userData));
    setAdminUser(userData);
    navigate('/admin/kasir');
  };
  ```
- [ ] Update logout handler:
  ```js
  const handleAdminLogout = () => {
    localStorage.removeItem('admin_user');
    setAdminUser(null);
    navigate('/admin/login');
  };
  ```

---

## 👤 PHASE 6: Customer Authentication (Supabase Auth)

### 6.1 Create Auth Context
- [ ] Buat `src/contexts/AuthContext.js`:
  ```js
  import { createContext, useContext, useEffect, useState } from 'react';
  import { supabaseAuth } from '../supabaseClient';
  
  const AuthContext = createContext({});
  
  export const AuthProvider = ({ children }) => {
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      // Check existing session
      supabaseAuth.auth.getSession().then(({ data: { session } }) => {
        setCustomer(session?.user || null);
        setLoading(false);
      });
      
      // Listen to auth changes
      const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
        (_event, session) => {
          setCustomer(session?.user || null);
        }
      );
      
      return () => subscription.unsubscribe();
    }, []);
    
    const signInWithGoogle = async () => {
      const { data, error } = await supabaseAuth.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/booking`
        }
      });
      if (error) throw error;
      return data;
    };
    
    const signOut = async () => {
      await supabaseAuth.auth.signOut();
      setCustomer(null);
    };
    
    return (
      <AuthContext.Provider value={{ customer, loading, signInWithGoogle, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  };
  
  export const useAuth = () => useContext(AuthContext);
  ```

### 6.2 Update Booking Page untuk Auth
- [ ] Update `src/pages/Booking.js`:
  - [ ] Wrap dengan AuthProvider
  - [ ] Check customer auth sebelum booking
  - [ ] Show Google login jika belum login
  - [ ] Use customer email untuk booking

---

## 🎨 PHASE 7: Update Components

### 7.1 Create Landing Footer Component
- [ ] Buat `src/components/landing/LandingFooter.js`:
  - [ ] Footer dengan info SnapMe
  - [ ] Tombol "Masuk ke Kasir" → link ke `/admin/login`
  - [ ] Social media links (optional)
  - [ ] Copyright

### 7.2 Update LandingNav Component
- [ ] Update `src/components/landing/LandingNav.js`:
  - [ ] Use React Router Link untuk navigation
  - [ ] Active state berdasarkan current route
  - [ ] Logo link ke `/`

### 7.3 Update Navigation Links
- [ ] Update semua internal links:
  - [ ] Pakai `react-router-dom` Link component
  - [ ] Update href menjadi navigate atau Link
  - [ ] Handle external links dengan `<a>`

---

## 🔄 PHASE 8: Route Protection & Guards

### 8.1 Admin Route Protection
- [ ] Buat `src/components/guards/AdminGuard.js`:
  ```js
  import { Navigate } from 'react-router-dom';
  
  const AdminGuard = ({ children, user }) => {
    if (!user) {
      return <Navigate to="/admin/login" replace />;
    }
    return children;
  };
  
  export default AdminGuard;
  ```

### 8.2 Customer Route Protection (Optional)
- [ ] Buat `src/components/guards/CustomerGuard.js`:
  ```js
  import { Navigate } from 'react-router-dom';
  import { useAuth } from '../../contexts/AuthContext';
  
  const CustomerGuard = ({ children }) => {
    const { customer, loading } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!customer) {
      return <Navigate to="/booking?login=true" replace />;
    }
    
    return children;
  };
  
  export default CustomerGuard;
  ```

---

## 📱 PHASE 9: Update Existing Pages

### 9.1 Update Kasir Page
- [ ] Update `src/pages/Kasir.js`:
  - [ ] Remove direct user check (sudah di guard)
  - [ ] Keep user prop dari AdminDashboard
  - [ ] Update navigation links jika ada

### 9.2 Update Other Admin Pages
- [ ] Update semua admin pages:
  - [ ] Dashboard, History, Stok, Reservasi, ClaimPhoto, Karyawan
  - [ ] Remove direct user check
  - [ ] Keep user prop dari AdminDashboard

### 9.3 Update Login Page
- [ ] Rename `src/pages/Login.js` → `src/pages/AdminLogin.js`
- [ ] Update untuk save session ke localStorage
- [ ] Update redirect setelah login

---

## 🔗 PHASE 10: Navigation Updates

### 10.1 Update Internal Links
- [ ] Update semua internal navigation:
  - [ ] Pakai `useNavigate()` dari react-router-dom
  - [ ] Update setCurrentPage menjadi navigate()
  - [ ] Handle browser back/forward

### 10.2 Update External Links
- [ ] Keep external links dengan `<a>` tag
- [ ] Add `target="_blank"` jika perlu
- [ ] Add `rel="noopener noreferrer"` untuk security

---

## 🧪 PHASE 11: Testing

### 11.1 Route Testing
- [ ] Test semua routes:
  - [ ] `/` → Landing Page
  - [ ] `/gallery` → Gallery
  - [ ] `/claim-photo` → Claim Photo
  - [ ] `/booking` → Booking
  - [ ] `/admin/login` → Admin Login
  - [ ] `/admin/kasir` → Kasir (protected)
  - [ ] `/admin/*` → Redirect jika tidak login

### 11.2 Auth Testing
- [ ] Test admin login:
  - [ ] Login → save ke localStorage
  - [ ] Refresh page → tetap login
  - [ ] Logout → clear localStorage
  - [ ] Direct access protected route → redirect ke login

### 11.3 Customer Auth Testing
- [ ] Test Google login:
  - [ ] Click login → redirect ke Google
  - [ ] After auth → redirect back ke booking
  - [ ] Session persist setelah refresh
  - [ ] Logout → clear session

---

## 📝 NOTES

### Route Structure:
```
/                          → Landing Page (Public)
/gallery                   → Gallery (Public)
/claim-photo              → Claim Photo (Public)
/booking                  → Booking (Public, but need auth untuk submit)
/booking/:packageId       → Booking dengan package (Public)

/admin/login              → Admin Login (Public)
/admin/kasir              → Kasir (Protected)
/admin/dashboard          → Dashboard (Protected)
/admin/history            → History (Protected)
/admin/stok               → Stok (Protected)
/admin/reservasi          → Reservasi (Protected)
/admin/claim-photo        → Claim Photo Admin (Protected)
/admin/karyawan          → Karyawan (Protected)
```

### Auth System:
- **Admin/Kasir**: Custom auth dengan tabel `users`
  - Session disimpan di localStorage
  - Tidak pakai Supabase Auth
  - Route: `/admin/*`

- **Customer/Booking**: Supabase Auth (Google OAuth)
  - Session managed oleh Supabase
  - Pakai `supabaseAuth` client
  - Route: `/booking`, `/claim-photo` (optional)

### Session Management:
- Admin session: `localStorage.getItem('admin_user')`
- Customer session: `supabaseAuth.auth.getSession()`
- Clear session saat logout

### Migration Notes:
- Tidak perlu pindah semua ke Supabase Auth
- Admin tetap pakai custom auth (tabel users)
- Hanya customer/booking yang pakai Supabase Auth
- Dual client: `supabase` (admin) dan `supabaseAuth` (customer)

---

## ✅ CHECKLIST SUMMARY

- [ ] Phase 1: Install Dependencies
- [ ] Phase 2: Update Supabase Client Configuration
- [ ] Phase 3: Create Router Structure
- [ ] Phase 4: Create Landing Pages
- [ ] Phase 5: Admin Authentication (Custom Auth)
- [ ] Phase 6: Customer Authentication (Supabase Auth)
- [ ] Phase 7: Update Components
- [ ] Phase 8: Route Protection & Guards
- [ ] Phase 9: Update Existing Pages
- [ ] Phase 10: Navigation Updates
- [ ] Phase 11: Testing

---

**Last Updated:** 2025-01-XX
**Status:** 🚧 In Progress

