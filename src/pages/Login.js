import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { SnapMeLogoCard } from '../components/SnapMeLogo';

const Login = ({ onLogin }) => {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(''); // Reset error message
    
    try {
      // Query langsung ke tabel users untuk validasi
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('password_hash', loginForm.password)
        .eq('is_active', true)
        .single();
      
      if (error || !userData) {
        setErrorMessage('Username atau password salah, atau akun tidak aktif');
        setLoading(false);
        return;
      }

      onLogin(userData);
      setLoginForm({ username: '', password: '' });
      
    } catch (error) {
      console.error('💥 Login error:', error);
      setErrorMessage('Gagal login: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="login-container">
          <div style={{
            maxWidth: '400px',
            width: '100%',
            margin: '0 auto'
          }}>
            <SnapMeLogoCard>
              <div style={{ marginTop: '20px' }}>
                <h1 style={{ 
                  fontSize: '1.5rem', 
                  marginBottom: '8px',
                  color: 'white',
                  fontWeight: '600'
                }}>
                  🔐 Login Kasir
                </h1>
                <p style={{ 
                  fontSize: '0.9rem', 
                  opacity: 0.8,
                  color: 'white',
                  margin: 0
                }}>
                  Silakan masuk untuk melanjutkan
                </p>
              </div>
            </SnapMeLogoCard>

            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '30px',
              marginTop: '20px',
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.1)',
              border: '1px solid #e2e8f0'
            }}>
              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <label htmlFor="username">👤 Username:</label>
                  <input
                    type="text"
                    id="username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({...prev, username: e.target.value}))}
                    placeholder="Masukkan username..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="password">🔑 Password:</label>
                  <input
                    type="password"
                    id="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({...prev, password: e.target.value}))}
                    placeholder="Masukkan password..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="generate-btn"
                  style={{
                    width: '100%',
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '15px',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    marginBottom: '15px'
                  }}
                >
                  {loading && <span className="loading"></span>}
                  {loading ? 'Login...' : 'Login'}
                </button>
                {errorMessage && (
                  <div style={{
                    marginTop: '15px',
                    padding: '12px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}>
                    ❌ {errorMessage}
                  </div>
                )}
              </form>
              
              <div style={{
                marginTop: '25px',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: '#1e3a8a',
                  fontSize: '0.9rem'
                }}>
                  📋 Demo Credentials:
                </p>
                <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Admin:</strong> username: admin, password: admin123
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Kasir 1:</strong> username: valorantdiva1@gmail.com, password: kasir123
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Kasir 2:</strong> username: valorantdiva2@gmail.com, password: admin123
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 