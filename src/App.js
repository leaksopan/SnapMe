import React, { useState, lazy, Suspense } from 'react';
import './App.css';

// Import page components - lazy load untuk optimasi
import Login from './pages/Login';
import Kasir from './pages/Kasir';
import Navigation from './components/Navigation';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const History = lazy(() => import('./pages/History'));
const Stok = lazy(() => import('./pages/Stok'));
const Karyawan = lazy(() => import('./pages/Karyawan'));

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('kasir');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Handle login
  const handleLogin = async (userData) => {
    setUser(userData);
  };

  // Handle logout
  const handleLogout = async () => {
    setUser(null);
    setCurrentPage('kasir');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    let pageComponent;
    switch (currentPage) {
      case 'kasir':
        pageComponent = <Kasir user={user} onLogout={handleLogout} />;
        break;
      case 'dashboard':
        pageComponent = user.role === 'admin' ? (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>⏳ Memuat dashboard...</div>}>
            <Dashboard user={user} onLogout={handleLogout} />
          </Suspense>
        ) : <Kasir user={user} onLogout={handleLogout} />;
        break;
      case 'history':
        pageComponent = (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>⏳ Memuat halaman...</div>}>
            <History user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      case 'stok':
        pageComponent = (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>⏳ Memuat halaman...</div>}>
            <Stok user={user} onLogout={handleLogout} />
          </Suspense>
        );
        break;
      case 'karyawan':
        pageComponent = user.role === 'admin' ? (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px' }}>⏳ Memuat halaman...</div>}>
            <Karyawan user={user} onLogout={handleLogout} />
          </Suspense>
        ) : <Kasir user={user} onLogout={handleLogout} />;
        break;
      default:
        pageComponent = <Kasir user={user} onLogout={handleLogout} />;
    }
    
    return pageComponent;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navigation 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLogout={handleLogout}
      />
      <div style={{ 
        marginLeft: sidebarOpen ? '280px' : '70px',
        width: '100%',
        transition: 'margin-left 0.3s ease'
      }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
