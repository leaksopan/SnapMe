import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

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
          <div className="login-box">
            <h1>🔐 Login Kasir SnapMe</h1>
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
                />
              </div>
              <button type="submit" disabled={loading} className="generate-btn">
                {loading && <span className="loading"></span>}
                {loading ? 'Login...' : 'Login'}
              </button>
              {errorMessage && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '5px',
                  color: '#c33',
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}>
                  ❌ {errorMessage}
                </div>
              )}
            </form>
            <div className="demo-credentials">
              <p><strong>Demo credentials:</strong></p>
              <p>Username: admin, Password: admin123</p>
              <p>Username: valorantdiva1@gmail.com, Password: kasir123</p>
              <p>Username: valorantdiva2@gmail.com, Password: admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 