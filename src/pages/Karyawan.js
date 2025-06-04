import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const Karyawan = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password_hash: '',
    full_name: '',
    role: 'kasir',
    is_active: true
  });

  // Debouncing state for username checking
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Get current date
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("id-ID", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Load users from users table with optimized performance
  const loadUsers = useCallback(async () => {
    console.log('👥 Loading users...');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });
      
      if (error) {
        console.error('❌ Error loading users:', error);
        throw error;
      }
      
      console.log(`✅ Loaded ${data?.length || 0} users successfully`);
      setUsers(data || []);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      alert('Gagal memuat data karyawan: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced username check function
  const checkUsernameAvailability = useCallback(async (username) => {
    if (!username || username.length < 3) {
      setUsernameError('');
      return;
    }

    setUsernameCheckLoading(true);
    setUsernameError('');

    try {
      const { data: existingUsers, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username);

      if (error) {
        console.error('❌ Error checking username:', error);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        // Check if it's the current editing user
        if (editingUser && existingUsers[0].username === editingUser.username) {
          setUsernameError('');
        } else {
          setUsernameError('Username sudah digunakan');
        }
      } else {
        setUsernameError('');
      }
    } catch (error) {
      console.error('❌ Username check failed:', error);
    } finally {
      setUsernameCheckLoading(false);
    }
  }, [editingUser]);

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
    if (user.role !== 'admin') {
      alert('Hanya admin yang dapat menambah karyawan');
      return;
    }

    // Check username error before proceeding
    if (usernameError) {
      alert(usernameError);
      return;
    }

    setLoading(true);
    try {
      console.log('✅ Creating user with validated username...');

      // Insert new user (username already validated by debounced check)
      const { error } = await supabase
        .from('users')
        .insert([{
          username: formData.username,
          password_hash: formData.password_hash,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active
        }]);

      if (error) throw error;

      setFormData({
        username: '',
        password_hash: '',
        full_name: '',
        role: 'kasir',
        is_active: true
      });
      setUsernameError('');
      setShowAddForm(false);
      await loadUsers();
      alert('Karyawan berhasil ditambahkan');
    } catch (error) {
      console.error('❌ Error adding user:', error);
      alert('Gagal menambah karyawan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      alert('Hanya admin yang dapat mengupdate karyawan');
      return;
    }

    // Check username error before proceeding (unless it's the same username)
    if (usernameError && formData.username !== editingUser?.username) {
      alert(usernameError);
      return;
    }

    setLoading(true);
    try {
      console.log('✅ Updating user with validated data...');

      // Prepare update data
      const updateData = {
        username: formData.username,
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active
      };

      // Only update password if provided
      if (formData.password_hash) {
        updateData.password_hash = formData.password_hash;
      }

      // Update user
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      setEditingUser(null);
      setFormData({
        username: '',
        password_hash: '',
        full_name: '',
        role: 'kasir',
        is_active: true
      });
      setUsernameError('');
      await loadUsers();
      alert('Karyawan berhasil diupdate');
    } catch (error) {
      console.error('❌ Error updating user:', error);
      alert('Gagal mengupdate karyawan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userToDelete) => {
    if (user.role !== 'admin') {
      alert('Hanya admin yang dapat menghapus karyawan');
      return;
    }

    if (userToDelete.id === user.id) {
      alert('Anda tidak dapat menghapus akun sendiri');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus karyawan "${userToDelete.full_name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      await loadUsers();
      alert('Karyawan berhasil dihapus');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Gagal menghapus karyawan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const startEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      username: userToEdit.username,
      password_hash: '', // Don't prefill password
      full_name: userToEdit.full_name,
      role: userToEdit.role,
      is_active: userToEdit.is_active
    });
    setShowAddForm(false);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password_hash: '',
      full_name: '',
      role: 'kasir',
      is_active: true
    });
    setUsernameError('');
    setUsernameCheckLoading(false);
  };

  // Reset password
  const resetPassword = async (userToReset) => {
    if (user.role !== 'admin') {
      alert('Hanya admin yang dapat reset password');
      return;
    }

    const newPassword = userToReset.role === 'admin' ? 'admin123' : 'kasir123';
    
    if (!window.confirm(`Reset password untuk "${userToReset.full_name}" ke "${newPassword}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', userToReset.id);

      if (error) throw error;
      
      alert(`Password untuk ${userToReset.full_name} telah direset ke: ${newPassword}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Gagal reset password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const roles = {
    admin: { name: 'Administrator', icon: '👑', color: '#e74c3c' },
    kasir: { name: 'Kasir', icon: '👨‍💼', color: '#3498db' }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>👥 Manajemen Karyawan</h1>
          <div className="user-info">
            <p>Selamat datang, <strong>{user.full_name}</strong></p>
            <p>{getCurrentDate()}</p>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="tools" style={{ marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <button onClick={loadUsers} disabled={loading}>
            🔄 {loading ? 'Memuat...' : 'Refresh Data'}
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingUser(null);
                cancelEdit();
              }}
              style={{ backgroundColor: showAddForm ? '#e74c3c' : '#27ae60' }}
            >
              {showAddForm ? '❌ Batal' : '➕ Tambah Karyawan'}
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingUser) && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>{editingUser ? '✏️ Edit Karyawan' : '➕ Tambah Karyawan Baru'}</h3>
            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div className="input-group">
                  <label>Username:</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
                      placeholder="Masukkan username..."
                      required
                      style={{
                        border: usernameError ? '2px solid #e74c3c' : '1px solid #ddd',
                        paddingRight: usernameCheckLoading ? '35px' : '10px'
                      }}
                    />
                    {usernameCheckLoading && (
                      <div style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        border: '2px solid #3498db',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    )}
                  </div>
                  {usernameError && (
                    <div style={{ 
                      color: '#e74c3c', 
                      fontSize: '0.8rem', 
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ❌ {usernameError}
                    </div>
                  )}
                  {formData.username && !usernameError && !usernameCheckLoading && formData.username.length >= 3 && (
                    <div style={{ 
                      color: '#27ae60', 
                      fontSize: '0.8rem', 
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ✅ Username tersedia
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={formData.password_hash}
                    onChange={(e) => setFormData(prev => ({...prev, password_hash: e.target.value}))}
                    placeholder={editingUser ? "Kosongkan jika tidak ingin ubah..." : "Masukkan password..."}
                    required={!editingUser}
                    minLength="6"
                  />
                </div>
                <div className="input-group">
                  <label>Nama Lengkap:</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                    placeholder="Masukkan nama lengkap..."
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Role:</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({...prev, role: e.target.value}))}
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
                    onChange={(e) => setFormData(prev => ({...prev, is_active: e.target.value === 'true'}))}
                    required
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading} className="generate-btn">
                  {loading ? '⏳ Menyimpan...' : (editingUser ? '💾 Update' : '➕ Tambah')}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddForm(false);
                    cancelEdit();
                  }}
                  style={{ background: '#95a5a6', color: 'white' }}
                >
                  ❌ Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="main-content">
          {loading && <div style={{ textAlign: 'center', padding: '20px' }}>⏳ Memuat data...</div>}
          
          {!loading && users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              <h3>Belum ada data karyawan</h3>
              <p>Klik tombol "Tambah Karyawan" untuk menambah data</p>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div>
              {Object.entries(roles).map(([roleKey, roleInfo]) => {
                const roleUsers = users.filter(u => u.role === roleKey);

                return (
                  <div key={roleKey} style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: roleInfo.color, marginBottom: '15px' }}>
                      {roleInfo.icon} {roleInfo.name} ({roleUsers.length})
                    </h3>
                    <div style={{display: 'grid', gap: '10px'}}>
                      {roleUsers.map((userItem) => (
                        <div key={userItem.id} className="history-card" style={{ padding: '15px' }}>
                          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'center'}}>
                            <div>
                              <strong style={{ color: userItem.is_active ? '#2c3e50' : '#7f8c8d' }}>
                                {userItem.full_name}
                              </strong>
                              <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                                @{userItem.username}
                              </div>
                            </div>
                            <div>
                              <span style={{ 
                                background: roleInfo.color, 
                                color: 'white', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem' 
                              }}>
                                {roleInfo.icon} {roleInfo.name}
                              </span>
                            </div>
                            <div>
                              <span style={{ 
                                color: userItem.is_active ? '#27ae60' : '#e74c3c',
                                fontWeight: '600'
                              }}>
                                {userItem.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                              </span>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                                📅 Dibuat: {new Date(userItem.created_at).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                            {user.role === 'admin' && (
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <button 
                                  onClick={() => startEdit(userItem)}
                                  style={{ 
                                    background: '#3498db', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '5px 10px', 
                                    borderRadius: '3px',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button 
                                  onClick={() => resetPassword(userItem)}
                                  style={{ 
                                    background: '#f39c12', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '5px 10px', 
                                    borderRadius: '3px',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  🔑 Reset PW
                                </button>
                                {userItem.id !== user.id && (
                                  <button 
                                    onClick={() => handleDeleteUser(userItem)}
                                    style={{ 
                                      background: '#e74c3c', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '5px 10px', 
                                      borderRadius: '3px',
                                      fontSize: '0.8rem'
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
      </div>
    </div>
  );
};

export default Karyawan; 