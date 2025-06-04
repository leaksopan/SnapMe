import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const History = ({ user, onLogout }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState(new Set());

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

  // Load transactions from Supabase
  const loadTransactions = async () => {
    setLoading(true);
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
        .order('created_at', { ascending: false })
        .limit(50); // Limit untuk performa
      
      if (transactionError) {
        console.error('❌ Transaction query error:', transactionError);
        throw transactionError;
      }
      
      setTransactions(transactionData || []);
      
    } catch (error) {
      console.error('❌ History: Error loading transactions:', error);
      
      // More specific error handling
      let errorMessage = 'Gagal memuat riwayat transaksi';
      if (error.message?.includes('400')) {
        errorMessage = 'Error 400: Request tidak valid ke database';
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'Error: Tidak ada izin akses ke database';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (transactions.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const csvData = transactions.map(tr => ({
      'No Transaksi': tr.transaction_number,
      'Tanggal': new Date(tr.created_at).toLocaleDateString('id-ID'),
      'Customer': tr.customer_name,
      'Kasir': tr.users?.full_name || 'Unknown',
      'Metode Pembayaran': tr.payment_method,
      'Total': tr.total_amount,
      'Items': tr.transaction_items.map(item => 
        `${item.items?.name || 'Unknown'} (${item.quantity}x)`
      ).join('; ')
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-${getCurrentDate()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Clear transactions (admin only)
  const clearTransactions = async () => {
    if (user.role !== 'admin') {
      alert('Hanya admin yang dapat menghapus data transaksi');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin menghapus SEMUA data transaksi? Tindakan ini tidak dapat dibatalkan!')) {
      return;
    }

    setLoading(true);
    try {
      // Delete transaction items first (foreign key constraint)
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .delete()
        .neq('id', 0); // Delete all

      if (itemsError) throw itemsError;

      // Then delete transactions
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .neq('id', 0); // Delete all

      if (transactionsError) throw transactionsError;

      setTransactions([]);
      alert('Semua data transaksi berhasil dihapus');
    } catch (error) {
      console.error('Error clearing transactions:', error);
      alert('Gagal menghapus data transaksi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle expand/collapse detail transaksi
  const handleToggleDetails = (transactionId) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  // Expand semua transaksi
  const handleExpandAll = () => {
    const allTransactionIds = new Set(transactions.map(tr => tr.id));
    setExpandedTransactions(allTransactionIds);
  };

  // Collapse semua transaksi
  const handleCollapseAll = () => {
    setExpandedTransactions(new Set());
  };

  // Load transactions on component mount
  useEffect(() => {
    loadTransactions();
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>📊 Riwayat Transaksi</h1>
          <div className="user-info">
            <p>Selamat datang, <strong>{user.full_name}</strong></p>
            <p>{getCurrentDate()}</p>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="tools" style={{ marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <button onClick={loadTransactions} disabled={loading}>
            🔄 {loading ? 'Memuat...' : 'Refresh Data'}
          </button>
          <button onClick={exportToCSV} disabled={transactions.length === 0}>
            📁 Ekspor CSV
          </button>
          {transactions.length > 0 && (
            <>
              <button 
                onClick={handleExpandAll} 
                style={{ background: '#3498db', color: 'white' }}
                disabled={expandedTransactions.size === transactions.length}
              >
                📖 Buka Semua
              </button>
              <button 
                onClick={handleCollapseAll} 
                style={{ background: '#95a5a6', color: 'white' }}
                disabled={expandedTransactions.size === 0}
              >
                📄 Tutup Semua
              </button>
            </>
          )}
          {user.role === 'admin' && (
            <button onClick={clearTransactions} className="danger-btn" disabled={loading}>
              🗑️ Hapus Semua Data
            </button>
          )}
        </div>

        <div className="history-section">
          {loading ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#7f8c8d'}}>
              <div className="loading" style={{ margin: '0 auto 20px' }}></div>
              <p>Memuat riwayat transaksi...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#7f8c8d'}}>
              <p style={{fontSize: '1.2rem', marginBottom: '10px'}}>📋</p>
              <p>Belum ada transaksi tersimpan</p>
            </div>
          ) : (
            <>
              {/* Status info */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '10px 15px', 
                background: '#e8f4fd', 
                borderRadius: '8px', 
                fontSize: '0.9rem',
                color: '#2c3e50',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  📊 Total: <strong>{transactions.length}</strong> transaksi
                </span>
                <span>
                  📖 Terbuka: <strong>{expandedTransactions.size}</strong> dari <strong>{transactions.length}</strong>
                </span>
              </div>
              <div style={{display: 'grid', gap: '15px'}}>
                {transactions.map((tr, index) => {
                  const isExpanded = expandedTransactions.has(tr.id);
                  return (
                    <div key={tr.id} className="history-card" style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: isExpanded ? '2px solid #3498db' : '2px solid transparent'
                    }}>
                      {/* Header yang bisa diklik */}
                      <div 
                        onClick={() => handleToggleDetails(tr.id)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '5px 0',
                          borderBottom: isExpanded ? '1px solid #ecf0f1' : 'none',
                          marginBottom: isExpanded ? '15px' : '0',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div>
                          <h4 style={{ margin: '0', color: '#2c3e50' }}>
                            🧾 Transaksi #{tr.transaction_number}
                          </h4>
                          <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '0.9rem', color: '#7f8c8d' }}>
                            <span>👤 {tr.customer_name}</span>
                            <span>📅 {new Date(tr.created_at).toLocaleDateString('id-ID')}</span>
                            <span style={{ fontWeight: '600', color: '#27ae60' }}>
                              💰 Rp {formatRupiah(tr.total_amount)}
                            </span>
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: '1.5rem', 
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                          color: '#3498db',
                          fontWeight: 'bold'
                        }}>
                          ⌄
                        </div>
                      </div>

                      {/* Detail yang muncul ketika di-expand */}
                      {isExpanded && (
                        <div style={{
                          animation: 'slideDown 0.3s ease',
                          overflow: 'hidden'
                        }}>
                          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', margin: '15px 0'}}>
                            <p><strong>💰 Pembayaran:</strong> {tr.payment_method}</p>
                            <p><strong>👨‍💼 Kasir:</strong> {tr.users?.full_name || 'Unknown'}</p>
                            <p><strong>🕒 Waktu:</strong> {new Date(tr.created_at).toLocaleTimeString('id-ID')}</p>
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
                          <div style={{textAlign: 'right', fontSize: '1.1rem', fontWeight: '700', color: '#27ae60', marginTop: '10px'}}>
                            💰 Total: Rp {formatRupiah(tr.total_amount)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="total-box">
                💰 TOTAL PEMASUKAN: Rp {formatRupiah(
                  transactions.reduce((sum, tr) => sum + tr.total_amount, 0)
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default History; 