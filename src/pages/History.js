import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const History = ({ user, onLogout }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState(new Set());
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

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

  // Load transactions from Supabase with pagination
  const loadTransactions = async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      // Get total count first
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get paginated data
      const from = (page - 1) * size;
      const to = from + size - 1;

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
        .range(from, to);
      
      if (transactionError) {
        console.error('❌ Transaction query error:', transactionError);
        throw transactionError;
      }
      
      setTransactions(transactionData || []);
      setCurrentPage(page);
      
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

  // Handle page change
  const handlePageChange = (newPage) => {
    loadTransactions(newPage, pageSize);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    loadTransactions(1, newSize);
  };

  // Handle select transaction
  const handleSelectTransaction = (transactionId) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(tr => tr.id)));
    }
  };

  // Delete selected transactions
  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) {
      alert('Pilih transaksi yang ingin dihapus');
      return;
    }

    if (user.role !== 'admin') {
      alert('Hanya admin yang dapat menghapus transaksi');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedTransactions.size} transaksi? Tindakan ini tidak dapat dibatalkan!`)) {
      return;
    }

    setLoading(true);
    try {
      const selectedIds = Array.from(selectedTransactions);

      // Delete transaction items first (foreign key constraint)
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .delete()
        .in('transaction_id', selectedIds);

      if (itemsError) throw itemsError;

      // Then delete transactions
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .in('id', selectedIds);

      if (transactionsError) throw transactionsError;

      setSelectedTransactions(new Set());
      alert(`${selectedIds.length} transaksi berhasil dihapus`);
      
      // Reload data
      loadTransactions(currentPage, pageSize);
    } catch (error) {
      console.error('Error deleting selected transactions:', error);
      alert('Gagal menghapus transaksi: ' + error.message);
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
      setSelectedTransactions(new Set());
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

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => loadTransactions(currentPage, pageSize)} disabled={loading}>
              🔄 {loading ? 'Memuat...' : 'Refresh Data'}
            </button>
            <button onClick={exportToCSV} disabled={transactions.length === 0}>
              📁 Ekspor CSV
            </button>
            
            {/* Page Size Selector */}
            <select 
              value={pageSize} 
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value={25}>25 per halaman</option>
              <option value={50}>50 per halaman</option>
              <option value={100}>100 per halaman</option>
              <option value={200}>200 per halaman</option>
            </select>

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
              <>
                <button onClick={clearTransactions} className="danger-btn" disabled={loading}>
                  🗑️ Hapus Semua Data
                </button>
                <button 
                  onClick={handleDeleteSelected} 
                  disabled={selectedTransactions.size === 0 || loading}
                  style={{ 
                    background: selectedTransactions.size > 0 ? '#e74c3c' : '#bdc3c7', 
                    color: 'white',
                    opacity: selectedTransactions.size > 0 ? 1 : 0.6
                  }}
                >
                  🗑️ Hapus Terpilih ({selectedTransactions.size})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pagination and Selection Controls */}
        {totalCount > 0 && (
          <div className="pagination-controls" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            padding: '15px',
            background: '#ecf0f1',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                  onChange={handleSelectAll}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>Pilih Semua ({selectedTransactions.size}/{transactions.length})</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                Menampilkan {startItem}-{endItem} dari {totalCount} transaksi
              </span>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  style={{ 
                    padding: '5px 10px', 
                    background: currentPage === 1 ? '#bdc3c7' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Prev
                </button>
                
                <span style={{ 
                  padding: '5px 15px', 
                  background: '#fff', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  {currentPage} / {totalPages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  style={{ 
                    padding: '5px 10px', 
                    background: currentPage === totalPages ? '#bdc3c7' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div style={{display: 'grid', gap: '15px'}}>
                {transactions.map((tr, index) => {
                  const isExpanded = expandedTransactions.has(tr.id);
                  const isSelected = selectedTransactions.has(tr.id);
                  
                  return (
                    <div key={tr.id} className="history-card" style={{ 
                      transition: 'all 0.3s ease',
                      border: isExpanded ? '2px solid #3498db' : isSelected ? '2px solid #e74c3c' : '2px solid transparent',
                      background: isSelected ? '#ffeaea' : 'white'
                    }}>
                      {/* Header dengan checkbox */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        {user.role === 'admin' && (
                          <label style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectTransaction(tr.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                            />
                          </label>
                        )}
                        
                        <div 
                          onClick={() => handleToggleDetails(tr.id)}
                          style={{
                            flex: 1,
                            cursor: 'pointer',
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
                      </div>

                      {/* Detail yang muncul ketika di-expand */}
                      {isExpanded && (
                        <div style={{
                          animation: 'slideDown 0.3s ease',
                          overflow: 'hidden',
                          marginLeft: user.role === 'admin' ? '35px' : '0'
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