import React, { useState, useEffect } from 'react';
import SnapMeLogo, { SnapMeIcon } from './SnapMeLogo';
import { getAvailablePages } from '../utils/permissions';

const Navigation = ({ currentPage, setCurrentPage, user, userPermissions, isOpen, setIsOpen, onLogout }) => {
  const [availablePages, setAvailablePages] = useState([]);

  // Get available pages when user or permissions change
  useEffect(() => {
    if (user) {
      const pages = getAvailablePages(user, userPermissions || {});
      setAvailablePages(pages);
    }
  }, [user, userPermissions]);

  const filteredPages = availablePages;

  return (
    <>
      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: isOpen ? '280px' : '70px',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)',
        transition: 'width 0.3s ease',
        zIndex: 1000,
        boxShadow: '2px 0 10px rgba(37, 99, 235, 0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {isOpen ? (
            <SnapMeLogo size="medium" variant="horizontal" showText={true} />
          ) : (
            <SnapMeIcon size="32px" />
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
          borderBottom: '1px solid #3b82f6',
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
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
                onMouseLeave={(e) => e.target.style.background = '#dc2626'}
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
                background: currentPage === page.key ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                border: 'none',
                color: 'white',
                padding: isOpen ? '15px 20px' : '15px 0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: isOpen ? '15px' : '0',
                justifyContent: isOpen ? 'flex-start' : 'center',
                borderLeft: currentPage === page.key ? '4px solid #60a5fa' : '4px solid transparent',
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
          borderTop: '1px solid #3b82f6',
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