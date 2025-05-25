import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import './App.css';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

function App() {
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New states for authentication and items
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [items, setItems] = useState({
    studio: [],
    addon: [],
    minuman: [],
    snack: []
  });

  // Add ref for scroll position
  const itemsPanelRef = useRef(null);
  const scrollPositions = useRef({});

  // Format rupiah
  const formatRupiah = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Get current date
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("id-ID", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Load items from Supabase
  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      const categorizedItems = {
        studio: data.filter(item => item.category === 'studio'),
        addon: data.filter(item => item.category === 'addon'),
        minuman: data.filter(item => item.category === 'minuman'),
        snack: data.filter(item => item.category === 'snack')
      };
      
      setItems(categorizedItems);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Gagal memuat data items');
    }
  };

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        alert('Username tidak ditemukan');
        return;
      }
      
      // Simple password check (in production, use proper bcrypt)
      if (loginForm.password === 'admin123' || loginForm.password === 'kasir123') {
        setUser(data);
        setLoginForm({ username: '', password: '' });
        await loadItems();
        await loadTransactions();
      } else {
        alert('Password salah');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Gagal login');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    setUser(null);
    setCart({});
    setCustomerName('');
    setPaymentMethod('');
    setTransactions([]);
  };

  // Memoized cart items calculation
  const cartItems = useMemo(() => {
    const allItems = [...items.studio, ...items.addon, ...items.minuman, ...items.snack];
    return Object.entries(cart)
      .filter(([itemId, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = allItems.find(i => i.id === itemId);
        return item ? {
          ...item,
          qty,
          subtotal: item.price * qty
        } : null;
      })
      .filter(Boolean);
  }, [cart, items]);

  // Memoized total calculation
  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartItems]);

  // Get cart items for display (now using memoized version)
  const getCartItems = useCallback(() => cartItems, [cartItems]);

  // Calculate total (now using memoized version)
  const calculateTotal = useCallback(() => totalAmount, [totalAmount]);

  // Optimized updateCart function with flushSync for immediate updates
  const updateCart = useCallback((itemId, qty) => {
    if (itemsPanelRef.current) {
      const currentScrollTop = itemsPanelRef.current.scrollTop;
      scrollPositions.current.itemsPanel = currentScrollTop;
      
      // Use flushSync to ensure immediate DOM update
      flushSync(() => {
        setCart(prev => ({
          ...prev,
          [itemId]: Math.max(0, qty)
        }));
      });
      
      // Restore scroll position immediately after flushSync
      itemsPanelRef.current.scrollTop = currentScrollTop;
    } else {
      setCart(prev => ({
        ...prev,
        [itemId]: Math.max(0, qty)
      }));
    }
  }, []);

  // Simplified scroll position restoration (backup for edge cases)
  useEffect(() => {
    if (itemsPanelRef.current && scrollPositions.current.itemsPanel !== undefined) {
      const targetScrollTop = scrollPositions.current.itemsPanel;
      
      // Backup restoration in case flushSync didn't work
      if (itemsPanelRef.current.scrollTop !== targetScrollTop) {
        itemsPanelRef.current.scrollTop = targetScrollTop;
      }
    }
  }, [cart]);

  // Load transactions from Supabase
  const loadTransactions = async () => {
    try {
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          *,
          users(full_name),
          transaction_items(
            *,
            items(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  // Generate receipt
  const generateReceipt = async () => {
    if (!customerName.trim()) {
      alert('Silakan masukkan nama customer terlebih dahulu.');
      return;
    }

    if (!paymentMethod) {
      alert('Silakan pilih metode pembayaran terlebih dahulu.');
      return;
    }

    const allItems = [...items.studio, ...items.addon, ...items.minuman, ...items.snack];
    const cartItems = [];
    let total = 0;

    Object.entries(cart).forEach(([itemId, qty]) => {
      if (qty > 0) {
        const item = allItems.find(i => i.id === itemId);
        if (item) {
          const subTotal = item.price * qty;
          cartItems.push({
            id: itemId,
            name: item.name,
            qty,
            price: item.price,
            subTotal
          });
          total += subTotal;
        }
      }
    });

    if (cartItems.length === 0) {
      alert('Mohon pilih minimal satu item untuk membuat nota.');
      return;
    }

    setLoading(true);

    try {
      // Generate transaction number
      const { data: transactionNumberData, error: numberError } = await supabase
        .rpc('generate_transaction_number');
      
      if (numberError) throw numberError;
      
      const transactionNumber = transactionNumberData;

      // Save transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          transaction_number: transactionNumber,
          customer_name: customerName,
          payment_method: paymentMethod,
          total_amount: total,
          user_id: user.id
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Save transaction items
      const transactionItems = cartItems.map(item => ({
        transaction_id: transactionData.id,
        item_id: item.id,
        quantity: item.qty,
        unit_price: item.price,
        subtotal: item.subTotal
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Generate PDF
      const doc = new jsPDF();
      doc.setFont("courier", "normal");
      doc.setFontSize(12);
      
      let receiptText = '=== Nota Pembayaran SnapMe Studio ===\n\n';
      receiptText += `No. Transaksi  : ${transactionNumber}\n`;
      receiptText += `Nama Customer  : ${customerName}\n`;
      receiptText += `Metode Bayar   : ${paymentMethod}\n`;
      receiptText += `Kasir          : ${user.full_name}\n`;
      receiptText += `Tanggal        : ${getCurrentDate()}\n\n`;
      receiptText += 'Item                          Total\n';
      receiptText += '-'.repeat(42) + '\n';

      cartItems.forEach(item => {
        const namaItem = `${item.name} x ${item.qty}`.padEnd(30);
        const hargaItem = `Rp ${formatRupiah(item.subTotal)}`.padStart(10);
        receiptText += `${namaItem}${hargaItem}\n`;
      });

      receiptText += '-'.repeat(42) + '\n';
      receiptText += `TOTAL`.padEnd(30) + `Rp ${formatRupiah(total)}\n\n`;
      receiptText += 'Snap Me Self Photo, Where moments come alive';

      doc.text(receiptText, 10, 10);
      doc.save(`nota-snapme-${transactionNumber}.pdf`);

      // Reset form
      setCart({});
      setCustomerName('');
      setPaymentMethod('');
      await loadTransactions();
      
      alert('Nota berhasil dibuat dan disimpan!');
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Gagal membuat nota: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (transactions.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    let csv = 'No Transaksi,Nama Customer,Tanggal,Pembayaran,Kasir,Item,Qty,Harga,Subtotal,Total\n';

    transactions.forEach(tr => {
      tr.transaction_items.forEach(item => {
        csv += `${tr.transaction_number},${tr.customer_name},${new Date(tr.created_at).toLocaleDateString('id-ID')},${tr.payment_method},${tr.users?.full_name || 'Unknown'},${item.items?.name || 'Unknown'},${item.quantity},${item.unit_price},${item.subtotal},${tr.total_amount}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'penjualan_snapme.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear all transactions
  const clearTransactions = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua data transaksi?')) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) throw error;
        
        setTransactions([]);
        alert('Semua data transaksi berhasil dihapus.');
      } catch (error) {
        console.error('Error clearing transactions:', error);
        alert('Gagal menghapus data: ' + error.message);
      }
    }
  };

  // Clear cart function
  const clearCart = () => {
    if (window.confirm('Hapus semua item dari keranjang?')) {
      setCart({});
    }
  };

  useEffect(() => {
    // Auto-load items if user is already logged in
    if (user) {
      loadItems();
      loadTransactions();
    }
  }, [user]);

  // Login form component
  if (!user) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login-form">
            <h1>SnapMe Studio</h1>
            <h2>Sistem Kasir</h2>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="username">Username:</label>
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
                <label htmlFor="password">Password:</label>
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
            </form>
            <div className="demo-credentials">
              <p><strong>Demo credentials:</strong></p>
              <p>Username: admin, Password: admin123</p>
              <p>Username: kasir1, Password: kasir123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Memoized quantity input component to prevent unnecessary re-renders
  const QuantityInput = React.memo(({ itemId, value, onChange }) => (
    <input
      type="number"
      min="0"
      value={value || 0}
      onChange={onChange}
      className={`qty-input ${value > 0 ? 'has-value' : ''}`}
      placeholder="Qty"
    />
  ));

  // Memoized ItemSection component to prevent unnecessary re-renders
  const ItemSection = React.memo(({ title, itemList, icon }) => (
    <div className="section">
      <h2 style={{fontSize: '1.3rem'}}>
        <span style={{marginRight: '10px'}}>{icon}</span>
        {title}
      </h2>
      <div className="items-grid">
        {itemList.map(item => (
          <div 
            key={item.id} 
            className={`item-card ${cart[item.id] > 0 ? 'has-items' : ''}`}
          >
            <div className="item-info">
              <span className="item-name">{item.name}</span>
              <span className="item-price">Rp {formatRupiah(item.price)}</span>
            </div>
            <QuantityInput
              itemId={item.id}
              value={cart[item.id]}
              onChange={(e) => updateCart(item.id, parseInt(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>
    </div>
  ));

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>SnapMe Studio Kasir</h1>
          <div className="user-info">
            <p>Selamat datang, <strong>{user.full_name}</strong></p>
            <p>{getCurrentDate()}</p>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="main-content">
          <div className="items-panel" ref={itemsPanelRef}>
            <ItemSection 
              title="Katalog Paket Studio" 
              itemList={items.studio} 
              icon="📸"
            />
            <ItemSection 
              title="Add-on Cetak Foto" 
              itemList={items.addon} 
              icon="🖼️"
            />
            <ItemSection 
              title="Add-on Minuman" 
              itemList={items.minuman} 
              icon="🥤"
            />
            <ItemSection 
              title="Add-on Snack" 
              itemList={items.snack} 
              icon="🍿"
            />
          </div>

          <div className="checkout-panel">
            <div className="checkout-header">
              <h3>💳 Checkout</h3>
              <div className="date-display">{getCurrentDate()}</div>
            </div>

            {/* Cart Summary */}
            <div style={{marginBottom: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <h4 style={{color: '#2c3e50', margin: 0}}>🛒 Keranjang</h4>
                {getCartItems().length > 0 && (
                  <button 
                    onClick={clearCart}
                    style={{
                      background: 'none',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Kosongkan
                  </button>
                )}
              </div>
              <div style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '15px',
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #ecf0f1'
              }}>
                {getCartItems().length === 0 ? (
                  <div style={{textAlign: 'center', color: '#7f8c8d', padding: '20px'}}>
                    <p style={{margin: 0, fontSize: '0.9rem'}}>Keranjang kosong</p>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {getCartItems().map(item => (
                      <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        background: 'white',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}>
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: '600', color: '#2c3e50'}}>{item.name}</div>
                          <div style={{color: '#7f8c8d', fontSize: '0.8rem'}}>
                            {item.qty} x Rp {formatRupiah(item.price)}
                          </div>
                        </div>
                        <div style={{fontWeight: '700', color: '#27ae60'}}>
                          Rp {formatRupiah(item.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="input-group">
                <label htmlFor="customerName">👤 Nama Customer:</label>
                <input
                  type="text"
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                />
              </div>

              <div className="total-section">
                <div>Total Pembayaran</div>
                <span className="total-price">Rp {formatRupiah(calculateTotal())}</span>
                {getCartItems().length > 0 && (
                  <div style={{fontSize: '0.9rem', marginTop: '5px', opacity: 0.8}}>
                    {getCartItems().length} item(s) dipilih
                  </div>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="paymentMethod">💰 Metode Pembayaran:</label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Pilih metode pembayaran</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Transfer">🏦 Transfer Bank</option>
                  <option value="QRIS">📱 QRIS</option>
                  <option value="Debit">💳 Kartu Debit</option>
                </select>
              </div>

              <button 
                onClick={generateReceipt} 
                disabled={loading}
                className="generate-btn"
              >
                {loading && <span className="loading"></span>}
                {loading ? 'Memproses...' : '🧾 Buat Nota & Cetak'}
              </button>

              <div className="tools">
                <button onClick={() => setShowHistory(!showHistory)}>
                  📊 {showHistory ? 'Sembunyikan' : 'Lihat'} Riwayat
                </button>
                <button onClick={exportToCSV}>
                  📁 Ekspor CSV
                </button>
                {user.role === 'admin' && (
                  <button onClick={clearTransactions} className="danger-btn">
                    🗑️ Hapus Data
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {showHistory && (
          <div className="history-section">
            <h2>📊 Riwayat Transaksi</h2>
            {transactions.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px', color: '#7f8c8d'}}>
                <p style={{fontSize: '1.2rem', marginBottom: '10px'}}>📋</p>
                <p>Belum ada transaksi tersimpan</p>
              </div>
            ) : (
              <>
                <div style={{display: 'grid', gap: '15px'}}>
                  {transactions.map((tr, index) => (
                    <div key={tr.id} className="history-card">
                      <h4>🧾 Transaksi #{tr.transaction_number}</h4>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', margin: '15px 0'}}>
                        <p><strong>👤 Nama:</strong> {tr.customer_name}</p>
                        <p><strong>📅 Tanggal:</strong> {new Date(tr.created_at).toLocaleDateString('id-ID')}</p>
                        <p><strong>💰 Pembayaran:</strong> {tr.payment_method}</p>
                        <p><strong>👨‍💼 Kasir:</strong> {tr.users?.full_name || 'Unknown'}</p>
                      </div>
                      <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '10px 0'}}>
                        <strong>📦 Items:</strong>
                        <ul style={{marginTop: '8px'}}>
                          {tr.transaction_items.map((item, idx) => (
                            <li key={idx} style={{display: 'flex', justifyContent: 'space-between', padding: '2px 0'}}>
                              <span>{item.items?.name || 'Unknown'} x {item.quantity}</span>
                              <span style={{fontWeight: '600', color: '#27ae60'}}>Rp {formatRupiah(item.subtotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{textAlign: 'right', fontSize: '1.1rem', fontWeight: '700', color: '#27ae60'}}>
                        💰 Total: Rp {formatRupiah(tr.total_amount)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="total-box">
                  💰 TOTAL PEMASUKAN HARI INI: Rp {formatRupiah(
                    transactions.reduce((sum, tr) => sum + tr.total_amount, 0)
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
