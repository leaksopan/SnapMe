import React from 'react';

const Navigation = ({ currentPage, setCurrentPage, user, isOpen, setIsOpen, onLogout }) => {
  const pages = [
    { key: 'kasir', name: 'Kasir', icon: '💳', description: 'Transaksi Penjualan' },
    { key: 'dashboard', name: 'Dashboard', icon: '📊', description: 'Analytics & Monitoring', adminOnly: true },
    { key: 'history', name: 'Riwayat', icon: '📋', description: 'Riwayat Transaksi' },
    { key: 'stok', name: 'Stok', icon: '📦', description: 'Manajemen Stok' },
    { key: 'karyawan', name: 'Karyawan', icon: '👥', description: 'Manajemen Karyawan', adminOnly: true }
  ];

  const filteredPages = pages.filter(page => !page.adminOnly || user.role === 'admin');

  return (
    <>
      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: isOpen ? '280px' : '70px',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        transition: 'width 0.3s ease',
        zIndex: 1000,
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #34495e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {isOpen && (
            <div style={{ color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                📸 SnapMe Studio
              </h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
                Sistem Kasir
              </p>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '4px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            {isOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* User Info */}
        <div style={{
          padding: '15px 20px',
          borderBottom: '1px solid #34495e',
          color: 'white'
        }}>
          {isOpen ? (
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '8px' }}>
                {new Date().toLocaleDateString("id-ID", {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                👤 {user.full_name}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px', marginBottom: '10px' }}>
                {user.role === 'admin' ? '👑 Administrator' : '👨‍💼 Kasir'}
              </div>
              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#c0392b'}
                onMouseLeave={(e) => e.target.style.background = '#e74c3c'}
              >
                🚪 Logout
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem' }}>👤</div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, padding: '20px 0' }}>
          {filteredPages.map(page => (
            <button
              key={page.key}
              onClick={() => setCurrentPage(page.key)}
              style={{
                width: '100%',
                background: currentPage === page.key ? 'rgba(52, 152, 219, 0.2)' : 'transparent',
                border: 'none',
                color: 'white',
                padding: isOpen ? '15px 20px' : '15px 0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: isOpen ? '15px' : '0',
                justifyContent: isOpen ? 'flex-start' : 'center',
                borderLeft: currentPage === page.key ? '4px solid #3498db' : '4px solid transparent',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== page.key) {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== page.key) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{page.icon}</span>
              {isOpen && (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '600' }}>{page.name}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    {page.description}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #34495e',
          color: 'white'
        }}>
          {isOpen ? (
            <div style={{ fontSize: '0.8rem', opacity: 0.8, textAlign: 'center' }}>
              © 2024 SnapMe Studio
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '1rem' }}>
              ©
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && window.innerWidth <= 768 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation; 