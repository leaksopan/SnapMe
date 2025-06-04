import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    topProducts: [],
    recentTransactions: [],
    salesChart: [],
    lowStockItems: [],
    employeeStats: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // today, week, month, custom
  const [selectedChart, setSelectedChart] = useState('sales'); // sales, transactions
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Format rupiah
  const formatRupiah = (num) => {
    return `Rp ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  // Format tanggal
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get current date
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("id-ID", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get date range based on period
  const getDateRange = useCallback((period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(period) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          label: `${formatDate(today)}`
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          start: weekStart.toISOString(),
          end: now.toISOString(),
          label: `${formatDate(weekStart)} - ${formatDate(today)}`
        };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return {
          start: monthStart.toISOString(),
          end: now.toISOString(),
          label: `${formatDate(monthStart)} - ${formatDate(today)}`
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          // Set endDate to end of day
          endDate.setHours(23, 59, 59, 999);
          return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            label: `${formatDate(startDate)} - ${formatDate(endDate)}`
          };
        } else {
          // Fallback to today if custom dates not set
          return {
            start: today.toISOString(),
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            label: `${formatDate(today)}`
          };
        }
      default:
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          label: `${formatDate(today)}`
        };
    }
  }, [customStartDate, customEndDate]);

  // Load dashboard data - menggunakan useCallback untuk mengatasi ESLint warning
  const loadDashboardData = useCallback(async () => {
    console.time('⚡ Dashboard Data Load');
    setLoading(true);
    try {
      const dateRange = getDateRange(selectedPeriod);
      
      // 1. Total transactions dan revenue untuk periode dipilih
      const { data: periodTransactions, error: periodError } = await supabase
        .from('transactions')
        .select('total_amount, created_at')
        .gte('created_at', dateRange.start)
        .lt('created_at', dateRange.end);

      if (periodError) throw periodError;

      const periodSales = periodTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0;
      const periodCount = periodTransactions?.length || 0;

      // 2. Total revenue keseluruhan
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select('total_amount');

      if (allError) throw allError;

      const totalRevenue = allTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0;

      // 3. Top selling products
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('transaction_items')
        .select(`
          items(id, name, price),
          quantity
        `)
        .gte('created_at', dateRange.start)
        .lt('created_at', dateRange.end);

      if (topProductsError) throw topProductsError;

      // Aggregate product sales
      const productSales = {};
      topProductsData?.forEach(item => {
        const productId = item.items?.id;
        const productName = item.items?.name || 'Unknown';
        const quantity = item.quantity || 0;
        const revenue = (item.items?.price || 0) * quantity;

        if (productId) {
          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              quantity: 0,
              revenue: 0
            };
          }
          productSales[productId].quantity += quantity;
          productSales[productId].revenue += revenue;
        }
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // 4. Recent transactions
      const { data: recentTransactions, error: recentError } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          customer_name,
          total_amount,
          payment_method,
          created_at,
          users(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      // 5. Sales chart data (untuk custom range atau 7 hari terakhir)
      const salesChartData = [];
      
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        // Untuk custom range, buat chart berdasarkan range yang dipilih
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        // Limit maksimal 30 hari untuk chart
        const chartDays = Math.min(daysDiff, 30);
        
        for (let i = 0; i < chartDays; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

          const { data: dayTransactions } = await supabase
            .from('transactions')
            .select('total_amount')
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString());

          const dayRevenue = dayTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0;
          const dayCount = dayTransactions?.length || 0;

          salesChartData.push({
            date: dayStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            sales: dayRevenue,
            transactions: dayCount
          });
        }
      } else {
        // Default 7 hari terakhir
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

          const { data: dayTransactions } = await supabase
            .from('transactions')
            .select('total_amount')
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString());

          const dayRevenue = dayTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0;
          const dayCount = dayTransactions?.length || 0;

          salesChartData.push({
            date: dayStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            sales: dayRevenue,
            transactions: dayCount
          });
        }
      }

      // 6. Low stock items
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('items')
        .select('name, stock, price')
        .lte('stock', 10)
        .order('stock', { ascending: true })
        .limit(5);

      if (lowStockError) throw lowStockError;

      // 7. Employee stats
      const { data: employeeData, error: employeeError } = await supabase
        .from('transactions')
        .select(`
          user_id,
          total_amount,
          created_at,
          users(full_name)
        `)
        .gte('created_at', dateRange.start)
        .lt('created_at', dateRange.end);

      if (employeeError) throw employeeError;

      // Aggregate employee performance
      const employeeStats = {};
      employeeData?.forEach(transaction => {
        const userId = transaction.user_id;
        const userName = transaction.users?.full_name || 'Unknown';
        const amount = transaction.total_amount || 0;

        if (!employeeStats[userId]) {
          employeeStats[userId] = {
            name: userName,
            transactions: 0,
            revenue: 0
          };
        }
        employeeStats[userId].transactions += 1;
        employeeStats[userId].revenue += amount;
      });

      const topEmployees = Object.values(employeeStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setDashboardData({
        todaySales: periodSales,
        totalTransactions: periodCount,
        totalRevenue: totalRevenue,
        topProducts: topProducts,
        recentTransactions: recentTransactions || [],
        salesChart: salesChartData,
        lowStockItems: lowStockData || [],
        employeeStats: topEmployees
      });

      // Update last update timestamp when data successfully loaded
      setLastUpdate(new Date());
      console.log('✅ Dashboard data updated successfully');

    } catch (error) {
      console.error('❌ Dashboard: Error loading data:', error);
      alert('Gagal memuat data dashboard: ' + error.message);
    } finally {
      setLoading(false);
      console.timeEnd('⚡ Dashboard Data Load');
    }
  }, [selectedPeriod, getDateRange, customStartDate, customEndDate]); // Dependencies untuk useCallback

  // Load data when component mounts or period changes
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // Sekarang menggunakan loadDashboardData dari useCallback

  // Setup Supabase Realtime untuk auto-update
  useEffect(() => {
    console.log('🔌 Setting up Supabase Realtime...');
    
    // Subscribe to transactions table changes
    const transactionSubscription = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('🔄 Transaction change detected:', payload);
          // Auto refresh dashboard data when transaction changes
          setLastUpdate(new Date());
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'transaction_items'
        },
        (payload) => {
          console.log('🔄 Transaction items change detected:', payload);
          // Auto refresh dashboard data when transaction items change
          setLastUpdate(new Date());
          loadDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        setIsRealTimeConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('✅ Dashboard Realtime connected successfully!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Dashboard Realtime connection error');
          setIsRealTimeConnected(false);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up Supabase Realtime subscription...');
      supabase.removeChannel(transactionSubscription);
      setIsRealTimeConnected(false);
    };
  }, [loadDashboardData]);

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      setShowCustomPicker(true);
      // Set default dates if not set
      if (!customStartDate) {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        setCustomStartDate(lastWeek.toISOString().split('T')[0]);
        setCustomEndDate(today.toISOString().split('T')[0]);
      }
    } else {
      setShowCustomPicker(false);
    }
  };

  // Apply custom date range
  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      alert('Mohon pilih tanggal mulai dan tanggal akhir');
      return;
    }
    
    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
      return;
    }
    
    loadDashboardData();
  };

  // Chart component
  const SimpleChart = ({ data, type }) => {
    const maxValue = Math.max(...data.map(d => type === 'sales' ? d.sales : d.transactions));
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'end',
        height: '200px',
        gap: '8px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        {data.map((item, index) => {
          const value = type === 'sales' ? item.sales : item.transactions;
          const height = maxValue > 0 ? (value / maxValue) * 160 : 0;
          
          return (
            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%',
                height: `${height}px`,
                background: type === 'sales' ? '#3498db' : '#e74c3c',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'end',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '4px 0'
              }}>
                {value > 0 && (type === 'sales' ? formatRupiah(value).replace('Rp ', '') : value)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                {item.date}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Get period label for display
  const getPeriodLabel = () => {
    const dateRange = getDateRange(selectedPeriod);
    switch(selectedPeriod) {
      case 'today':
        return `Hari Ini (${dateRange.label})`;
      case 'week':
        return `7 Hari Terakhir (${dateRange.label})`;
      case 'month':
        return `30 Hari Terakhir (${dateRange.label})`;
      case 'custom':
        return `Periode Custom (${dateRange.label})`;
      default:
        return dateRange.label;
    }
  };

  // Get dynamic period text for cards
  const getPeriodText = () => {
    switch(selectedPeriod) {
      case 'today':
        return 'Hari Ini';
      case 'week':
        return '7 Hari';
      case 'month':
        return '30 Hari';
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // +1 untuk include hari terakhir
          return `${daysDiff} Hari`;
        }
        return 'Custom';
      default:
        return 'Hari Ini';
    }
  };

  // Get period description for cards
  const getPeriodDescription = () => {
    switch(selectedPeriod) {
      case 'today':
        return 'Penjualan Hari Ini';
      case 'week':
        return 'Penjualan 7 Hari';
      case 'month':
        return 'Penjualan 30 Hari';
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // +1 untuk include hari terakhir
          return `Penjualan ${daysDiff} Hari`;
        }
        return 'Penjualan Custom';
      default:
        return 'Penjualan Hari Ini';
    }
  };

  // Get transaction description for cards
  const getTransactionDescription = () => {
    switch(selectedPeriod) {
      case 'today':
        return 'Transaksi Hari Ini';
      case 'week':
        return 'Transaksi 7 Hari';
      case 'month':
        return 'Transaksi 30 Hari';
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // +1 untuk include hari terakhir
          return `Transaksi ${daysDiff} Hari`;
        }
        return 'Transaksi Custom';
      default:
        return 'Transaksi Hari Ini';
    }
  };

  // Get chart title dynamically
  const getChartTitle = () => {
    switch(selectedPeriod) {
      case 'today':
        return '📈 Tren Penjualan Hari Ini';
      case 'week':
        return '📈 Tren Penjualan (7 Hari Terakhir)';
      case 'month':
        return '📈 Tren Penjualan (30 Hari Terakhir)';
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          // Jika lebih dari 30 hari, tampilkan info bahwa chart dibatasi
          if (daysDiff > 30) {
            return '📈 Tren Penjualan (30 Hari Pertama dari Periode Custom)';
          }
          return `📈 Tren Penjualan (${daysDiff} Hari Custom)`;
        }
        return '📈 Tren Penjualan (Custom)';
      default:
        return '📈 Tren Penjualan (7 Hari Terakhir)';
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
          <h2>⏳ Memuat Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* CSS Animation for Pulse Effect */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>📊 Dashboard Admin</h1>
          <div className="user-info">
            <p>Selamat datang, <strong>{user.full_name}</strong></p>
            <p>{getCurrentDate()}</p>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* Period Filter dengan Date Range Picker */}
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>📅 Periode:</span>
            {['today', 'week', 'month', 'custom'].map(period => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: selectedPeriod === period ? '#3498db' : '#ffffff',
                  color: selectedPeriod === period ? 'white' : '#333',
                  cursor: 'pointer',
                  fontWeight: selectedPeriod === period ? 'bold' : 'normal'
                }}
              >
                {period === 'today' ? 'Hari Ini' : 
                 period === 'week' ? '7 Hari' : 
                 period === 'month' ? '30 Hari' : 
                 '📅 Custom'}
              </button>
            ))}
            <button
              onClick={loadDashboardData}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: '#27ae60',
                color: 'white',
                cursor: 'pointer',
                marginLeft: '20px'
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Custom Date Range Picker */}
          {showCustomPicker && (
            <div style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '8px',
              border: '2px solid #3498db',
              marginBottom: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontWeight: 'bold', color: '#3498db' }}>
                  🗓️ Pilih Rentang Tanggal:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Dari:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Sampai:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <button
                  onClick={handleApplyCustomRange}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    background: '#27ae60',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ✅ Terapkan
                </button>
              </div>
            </div>
          )}
          
          {/* Pivot Waktu Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: '#ffffff',
            borderRadius: '6px',
            border: '2px solid #3498db',
            boxShadow: '0 2px 4px rgba(52, 152, 219, 0.1)'
          }}>
            <span style={{ 
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#3498db'
            }}>
              📊
            </span>
            <span style={{ 
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Data untuk periode:
            </span>
            <span style={{ 
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#27ae60',
              background: '#ecf0f1',
              padding: '4px 12px',
              borderRadius: '20px'
            }}>
              {getPeriodLabel()}
            </span>
            <span style={{ 
              fontSize: '12px',
              color: '#7f8c8d',
              marginLeft: '10px'
            }}>
              • Terakhir diperbarui: {lastUpdate.toLocaleTimeString('id-ID')}
            </span>
            {/* Realtime Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '10px',
              padding: '4px 8px',
              borderRadius: '12px',
              background: isRealTimeConnected ? '#27ae60' : '#e74c3c',
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'white',
                animation: isRealTimeConnected ? 'pulse 2s infinite' : 'none'
              }}></div>
              {isRealTimeConnected ? '⚡ LIVE' : '❌ OFFLINE'}
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: '#3498db',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '2em' }}>💰</h3>
            <h2 style={{ margin: '0 0 5px 0' }}>{formatRupiah(dashboardData.todaySales)}</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {getPeriodDescription()}
            </p>
          </div>

          <div style={{
            background: '#e74c3c',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '2em' }}>📋</h3>
            <h2 style={{ margin: '0 0 5px 0' }}>{dashboardData.totalTransactions}</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {getTransactionDescription()}
            </p>
          </div>

          <div style={{
            background: '#27ae60',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '2em' }}>💎</h3>
            <h2 style={{ margin: '0 0 5px 0' }}>{formatRupiah(dashboardData.totalRevenue)}</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>Total Pendapatan</p>
          </div>

          <div style={{
            background: '#f39c12',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '2em' }}>📦</h3>
            <h2 style={{ margin: '0 0 5px 0' }}>{dashboardData.lowStockItems.length}</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>Produk Stok Rendah</p>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Sales Chart */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0 }}>{getChartTitle()}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedChart('sales')}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    background: selectedChart === 'sales' ? '#3498db' : '#ecf0f1',
                    color: selectedChart === 'sales' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Pendapatan
                </button>
                <button
                  onClick={() => setSelectedChart('transactions')}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    background: selectedChart === 'transactions' ? '#e74c3c' : '#ecf0f1',
                    color: selectedChart === 'transactions' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Transaksi
                </button>
              </div>
            </div>
            <SimpleChart data={dashboardData.salesChart} type={selectedChart} />
          </div>

          {/* Top Products */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>🏆 Produk Terlaris</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dashboardData.topProducts.slice(0, 5).map((product, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '6px'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {index + 1}. {product.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {product.quantity} terjual
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#27ae60' }}>
                      {formatRupiah(product.revenue)}
                    </div>
                  </div>
                </div>
              ))}
              {dashboardData.topProducts.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', margin: '20px 0' }}>
                  Belum ada data penjualan
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Recent Transactions */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>🕐 Transaksi Terbaru</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {dashboardData.recentTransactions.map((transaction, index) => (
                <div key={transaction.id} style={{
                  padding: '12px',
                  borderBottom: '1px solid #ecf0f1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {transaction.transaction_number}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {transaction.customer_name} • {transaction.users?.full_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#27ae60' }}>
                      {formatRupiah(transaction.total_amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {transaction.payment_method}
                    </div>
                  </div>
                </div>
              ))}
              {dashboardData.recentTransactions.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', margin: '20px 0' }}>
                  Belum ada transaksi
                </p>
              )}
            </div>
          </div>

          {/* Low Stock Alert */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>⚠️ Stok Rendah</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {dashboardData.lowStockItems.map((item, index) => (
                <div key={index} style={{
                  padding: '12px',
                  borderBottom: '1px solid #ecf0f1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatRupiah(item.price)}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: item.stock === 0 ? '#e74c3c' : item.stock <= 5 ? '#f39c12' : '#f39c12',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {item.stock} tersisa
                  </div>
                </div>
              ))}
              {dashboardData.lowStockItems.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', margin: '20px 0' }}>
                  Semua produk stok aman
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Employee Performance */}
        {dashboardData.employeeStats.length > 0 && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>👥 Performa Karyawan</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              {dashboardData.employeeStats.map((employee, index) => (
                <div key={index} style={{
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                  </div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {employee.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#27ae60', fontWeight: 'bold' }}>
                    {formatRupiah(employee.revenue)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {employee.transactions} transaksi
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 