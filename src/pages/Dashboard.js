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
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // today, week, month, custom
  const [selectedChart, setSelectedChart] = useState('sales'); // sales, transactions
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  // Toast notification function
  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Add realtime event to log
  const addRealtimeEvent = (event) => {
    const newEvent = {
      id: Date.now(),
      timestamp: new Date(),
      event: event,
      type: 'realtime'
    };
    setRealtimeEvents(prev => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 events
  };

  // Get date range based on period
  const getDateRange = useCallback((period) => {
    // Force UTC untuk konsistensi dengan database
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    
    switch(period) {
      case 'today':
        const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const todayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
        return {
          start: todayStart.toISOString(),
          end: todayEnd.toISOString(),
          label: `${formatDate(todayStart)}`
        };
      case 'week':
        const weekStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 7));
        const weekEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
        return {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: `${formatDate(weekStart)} - ${formatDate(today)}`
        };
      case 'month':
        const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30));
        const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
        return {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
          label: `${formatDate(monthStart)} - ${formatDate(today)}`
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate + 'T00:00:00.000Z'); // Force UTC
          const endDate = new Date(customEndDate + 'T23:59:59.999Z'); // Force UTC end of day
          return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            label: `${formatDate(startDate)} - ${formatDate(endDate)}`
          };
        } else {
          // Fallback to today if custom dates not set
          const fallbackStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
          const fallbackEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
          return {
            start: fallbackStart.toISOString(),
            end: fallbackEnd.toISOString(),
            label: `${formatDate(fallbackStart)}`
          };
        }
      default:
        const defaultStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const defaultEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
        return {
          start: defaultStart.toISOString(),
          end: defaultEnd.toISOString(),
          label: `${formatDate(defaultStart)}`
        };
    }
  }, [customStartDate, customEndDate]);

  // Load dashboard data - mendefinisikan dulu sebelum updateDashboardIncremental
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
      addRealtimeEvent(`✅ Data dashboard dimuat ulang`);

    } catch (error) {
      console.error('❌ Dashboard: Error loading data:', error);
      addRealtimeEvent(`❌ Error loading data: ${error.message}`);
      alert('Gagal memuat data dashboard: ' + error.message);
    } finally {
      setLoading(false);
      console.timeEnd('⚡ Dashboard Data Load');
    }
  }, [selectedPeriod, getDateRange, customStartDate, customEndDate]);

  // Incremental update functions untuk real-time tanpa refresh
  const updateDashboardIncremental = useCallback(async (newTransaction, action = 'INSERT') => {
    console.log('🔄 Updating dashboard incrementally...', { action, transaction: newTransaction });
    
    try {
      const dateRange = getDateRange(selectedPeriod);
      const transactionDate = new Date(newTransaction.created_at);
      const isInCurrentPeriod = transactionDate >= new Date(dateRange.start) && transactionDate < new Date(dateRange.end);
      
      if (action === 'INSERT') {
        // Update data secara incremental untuk transaksi baru
        setDashboardData(prevData => {
          const newData = { ...prevData };
          
          // 1. Update sales dan transactions count jika dalam periode
          if (isInCurrentPeriod) {
            newData.todaySales += newTransaction.total_amount || 0;
            newData.totalTransactions += 1;
          }
          
          // 2. Update total revenue (berlaku untuk semua transaksi)
          newData.totalRevenue += newTransaction.total_amount || 0;
          
          // 3. Add to recent transactions (di depan array)
          if (newTransaction.users?.full_name) {
            const newRecentTransaction = {
              ...newTransaction,
              users: { full_name: newTransaction.users.full_name }
            };
            newData.recentTransactions = [newRecentTransaction, ...prevData.recentTransactions.slice(0, 9)];
          }
          
          return newData;
        });
        
        // 4. Update top products secara incremental (fetch dari transaction items)
        try {
          const { data: transactionItems } = await supabase
            .from('transaction_items')
            .select(`
              items(id, name, price),
              quantity
            `)
            .eq('transaction_id', newTransaction.id);
          
          if (transactionItems && transactionItems.length > 0) {
            setDashboardData(prevData => {
              const updatedTopProducts = [...prevData.topProducts];
              
              transactionItems.forEach(item => {
                if (item.items) {
                  const existingIndex = updatedTopProducts.findIndex(p => p.name === item.items.name);
                  if (existingIndex >= 0) {
                    updatedTopProducts[existingIndex].quantity += item.quantity;
                    updatedTopProducts[existingIndex].revenue += (item.items.price * item.quantity);
                  } else if (updatedTopProducts.length < 5) {
                    updatedTopProducts.push({
                      name: item.items.name,
                      quantity: item.quantity,
                      revenue: item.items.price * item.quantity
                    });
                  }
                }
              });
              
              // Sort by quantity and take top 5
              updatedTopProducts.sort((a, b) => b.quantity - a.quantity);
              
              return {
                ...prevData,
                topProducts: updatedTopProducts.slice(0, 5)
              };
            });
          }
        } catch (error) {
          console.error('❌ Error updating top products:', error);
        }
        
      } else if (action === 'DELETE') {
        // Update data secara incremental untuk transaksi yang dihapus
        setDashboardData(prevData => {
          const newData = { ...prevData };
          
          // 1. Update sales dan transactions count jika dalam periode
          if (isInCurrentPeriod) {
            newData.todaySales -= newTransaction.total_amount || 0;
            newData.totalTransactions -= 1;
          }
          
          // 2. Update total revenue
          newData.totalRevenue -= newTransaction.total_amount || 0;
          
          // 3. Remove from recent transactions
          newData.recentTransactions = prevData.recentTransactions.filter(
            t => t.id !== newTransaction.id
          );
          
          return newData;
        });
      }
      
      setLastUpdate(new Date());
      console.log('✅ Dashboard updated incrementally');
      
    } catch (error) {
      console.error('❌ Error in incremental update:', error);
      // Fallback ke full reload jika ada error (tidak perlu dependency karena akan dipanggil)
      console.log('🔄 Falling back to full data reload...');
      setTimeout(() => {
        // Reload dashboard sebagai fallback
        window.location.reload();
      }, 1000);
    }
  }, [selectedPeriod, getDateRange]);

  // Load data when component mounts or period changes
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // Sekarang menggunakan loadDashboardData dari useCallback

  // Initialize dashboard and add initial log
  useEffect(() => {
    addRealtimeEvent('🚀 Dashboard dimuat dan siap menerima realtime updates');
  }, []);

  // Setup Supabase Realtime untuk auto-update (INCREMENTAL, NO REFRESH)
  useEffect(() => {
    console.log('🔌 Setting up Supabase Realtime (Incremental Mode)...');
    
    // Create a unique channel for dashboard
    const channelName = `dashboard-realtime-${Date.now()}`;
    console.log(`📡 Creating channel: ${channelName}`);
    
    // Subscribe to transactions table changes
    const transactionSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Listen to new transactions
          schema: 'public',
          table: 'transactions'
        },
        async (payload) => {
          console.log('🆕 New transaction detected (INCREMENTAL):', payload);
          addRealtimeEvent(`🆕 Transaksi baru: ${payload.new?.transaction_number || 'Unknown'}`);
          displayToast(`🆕 Transaksi baru masuk! ${payload.new?.customer_name || ''}`);
          
          // Fetch full transaction data including user info
          try {
            const { data: fullTransaction } = await supabase
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
              .eq('id', payload.new.id)
              .single();
            
            if (fullTransaction) {
              // Update dashboard secara incremental (NO REFRESH)
              updateDashboardIncremental(fullTransaction, 'INSERT');
            }
          } catch (error) {
            console.error('❌ Error fetching full transaction data:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Listen to transaction updates
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('📝 Transaction updated (INCREMENTAL):', payload);
          addRealtimeEvent(`📝 Transaksi diperbarui: ${payload.new?.transaction_number || 'Unknown'}`);
          setLastUpdate(new Date());
          
          // For updates, we'll do a selective update instead of full reload
          setDashboardData(prevData => ({
            ...prevData,
            recentTransactions: prevData.recentTransactions.map(t => 
              t.id === payload.new.id ? { ...t, ...payload.new } : t
            )
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE', // Listen to transaction deletions
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('🗑️ Transaction deleted (INCREMENTAL):', payload);
          addRealtimeEvent(`🗑️ Transaksi dihapus: ${payload.old?.transaction_number || 'Unknown'}`);
          displayToast(`🗑️ Transaksi dihapus dari sistem`);
          
          // Update dashboard secara incremental (NO REFRESH)
          updateDashboardIncremental(payload.old, 'DELETE');
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Realtime subscription status: ${status}`);
        if (err) {
          console.error('❌ Realtime subscription error:', err);
        }
        
        setIsRealTimeConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Dashboard Realtime connected successfully (INCREMENTAL MODE)!');
          console.log('🎯 Listening for changes on transactions table');
          addRealtimeEvent('🎯 Realtime mode: INCREMENTAL (seperti chat, tanpa refresh)');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Dashboard Realtime connection error');
          setIsRealTimeConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Dashboard Realtime connection timed out');
          setIsRealTimeConnected(false);
        } else if (status === 'CLOSED') {
          console.log('🔌 Dashboard Realtime connection closed');
          setIsRealTimeConnected(false);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up Supabase Realtime subscription...');
      if (transactionSubscription) {
        supabase.removeChannel(transactionSubscription);
      }
      setIsRealTimeConnected(false);
    };
  }, [updateDashboardIncremental]);

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

  // Function untuk generate laporan berdasarkan date range
  const generateReport = useCallback(async (startDate, endDate) => {
    console.log('📊 Generating report for:', { startDate, endDate });
    console.log('🕐 Date range (UTC):', { 
      start: new Date(startDate).toISOString(), 
      end: new Date(endDate).toISOString(),
      startLocal: new Date(startDate).toLocaleString('id-ID'),
      endLocal: new Date(endDate).toLocaleString('id-ID')
    });
    
    try {
      // 1. Get transaction items dengan detail lengkap
      const { data: transactionItems, error: itemsError } = await supabase
        .from('transaction_items')
        .select(`
          id,
          quantity,
          unit_price,
          subtotal,
          created_at,
          items(id, name, category, price),
          transactions(id, transaction_number, customer_name, created_at, users(full_name))
        `)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;
      
      console.log(`🔍 Found ${transactionItems?.length || 0} transaction items in range:`, transactionItems);

      // 2. Get data periode sebelumnya untuk perbandingan
      const periodDiff = new Date(endDate) - new Date(startDate);
      const previousStart = new Date(new Date(startDate).getTime() - periodDiff);
      const previousEnd = new Date(startDate);

      const { data: previousItems, error: previousError } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          subtotal,
          items(category)
        `)
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      if (previousError) throw previousError;

      // 3. Kategorisasi data
      const categoryA = ['studio', 'addon']; // Paket Studio & Add-on Cetak Foto
      const categoryB = ['minuman', 'snack']; // Add-on Minuman & Snack

      // 4. Process data per hari
      const dailyData = {};
      const itemDetails = {
        categoryA: {},
        categoryB: {}
      };

      // Initialize daily data structure
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      for (let d = new Date(startDateObj); d < endDateObj; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dailyData[dateKey] = {
          date: dateKey,
          categoryA: { revenue: 0, quantity: 0, transactions: new Set() },
          categoryB: { revenue: 0, quantity: 0, transactions: new Set() }
        };
      }

      // Process transaction items
      transactionItems?.forEach(item => {
        const itemCategory = item.items?.category;
        const itemDate = new Date(item.created_at).toISOString().split('T')[0];
        const revenue = item.subtotal || 0;
        const quantity = item.quantity || 0;
        const itemName = item.items?.name || 'Unknown';
        const transactionId = item.transactions?.id;

        // Add to daily data
        if (dailyData[itemDate]) {
          if (categoryA.includes(itemCategory)) {
            dailyData[itemDate].categoryA.revenue += revenue;
            dailyData[itemDate].categoryA.quantity += quantity;
            if (transactionId) dailyData[itemDate].categoryA.transactions.add(transactionId);

            // Add to item details
            if (!itemDetails.categoryA[itemName]) {
              itemDetails.categoryA[itemName] = { quantity: 0, revenue: 0, transactions: new Set() };
            }
            itemDetails.categoryA[itemName].quantity += quantity;
            itemDetails.categoryA[itemName].revenue += revenue;
            if (transactionId) itemDetails.categoryA[itemName].transactions.add(transactionId);

          } else if (categoryB.includes(itemCategory)) {
            dailyData[itemDate].categoryB.revenue += revenue;
            dailyData[itemDate].categoryB.quantity += quantity;
            if (transactionId) dailyData[itemDate].categoryB.transactions.add(transactionId);

            // Add to item details
            if (!itemDetails.categoryB[itemName]) {
              itemDetails.categoryB[itemName] = { quantity: 0, revenue: 0, transactions: new Set() };
            }
            itemDetails.categoryB[itemName].quantity += quantity;
            itemDetails.categoryB[itemName].revenue += revenue;
            if (transactionId) itemDetails.categoryB[itemName].transactions.add(transactionId);
          }
        }
      });

      // Convert Sets to counts
      Object.values(dailyData).forEach(day => {
        day.categoryA.transactions = day.categoryA.transactions.size;
        day.categoryB.transactions = day.categoryB.transactions.size;
      });

      Object.values(itemDetails.categoryA).forEach(item => {
        item.transactions = item.transactions.size;
      });
      Object.values(itemDetails.categoryB).forEach(item => {
        item.transactions = item.transactions.size;
      });

      // 5. Calculate totals
      const totalCategoryA = {
        revenue: Object.values(itemDetails.categoryA).reduce((sum, item) => sum + item.revenue, 0),
        quantity: Object.values(itemDetails.categoryA).reduce((sum, item) => sum + item.quantity, 0),
        transactions: Object.values(dailyData).reduce((sum, day) => sum + day.categoryA.transactions, 0)
      };

      const totalCategoryB = {
        revenue: Object.values(itemDetails.categoryB).reduce((sum, item) => sum + item.revenue, 0),
        quantity: Object.values(itemDetails.categoryB).reduce((sum, item) => sum + item.quantity, 0),
        transactions: Object.values(dailyData).reduce((sum, day) => sum + day.categoryB.transactions, 0)
      };

      // 6. Calculate previous period comparison
      const previousCategoryA = {
        revenue: previousItems?.filter(item => categoryA.includes(item.items?.category))
          .reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0,
        quantity: previousItems?.filter(item => categoryA.includes(item.items?.category))
          .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      };

      const previousCategoryB = {
        revenue: previousItems?.filter(item => categoryB.includes(item.items?.category))
          .reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0,
        quantity: previousItems?.filter(item => categoryB.includes(item.items?.category))
          .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      };

      // 7. Calculate growth percentages
      const growthA = {
        revenue: previousCategoryA.revenue > 0 ? 
          ((totalCategoryA.revenue - previousCategoryA.revenue) / previousCategoryA.revenue * 100) : 0,
        quantity: previousCategoryA.quantity > 0 ? 
          ((totalCategoryA.quantity - previousCategoryA.quantity) / previousCategoryA.quantity * 100) : 0
      };

      const growthB = {
        revenue: previousCategoryB.revenue > 0 ? 
          ((totalCategoryB.revenue - previousCategoryB.revenue) / previousCategoryB.revenue * 100) : 0,
        quantity: previousCategoryB.quantity > 0 ? 
          ((totalCategoryB.quantity - previousCategoryB.quantity) / previousCategoryB.quantity * 100) : 0
      };

      const reportResult = {
        dateRange: {
          start: startDate,
          end: endDate,
          label: `${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}`
        },
        categoryA: {
          name: 'Studio & Cetak Foto',
          total: totalCategoryA,
          previous: previousCategoryA,
          growth: growthA,
          items: Object.entries(itemDetails.categoryA).map(([name, data]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue,
            transactions: data.transactions,
            avgPerTransaction: data.transactions > 0 ? (data.revenue / data.transactions) : 0
          })).sort((a, b) => b.revenue - a.revenue)
        },
        categoryB: {
          name: 'Minuman & Snack',
          total: totalCategoryB,
          previous: previousCategoryB,
          growth: growthB,
          items: Object.entries(itemDetails.categoryB).map(([name, data]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue,
            transactions: data.transactions,
            avgPerTransaction: data.transactions > 0 ? (data.revenue / data.transactions) : 0
          })).sort((a, b) => b.revenue - a.revenue)
        },
        dailyBreakdown: Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date)),
        summary: {
          totalRevenue: totalCategoryA.revenue + totalCategoryB.revenue,
          totalQuantity: totalCategoryA.quantity + totalCategoryB.quantity,
          totalTransactions: Math.max(totalCategoryA.transactions, totalCategoryB.transactions),
          categoryAPercentage: totalCategoryA.revenue + totalCategoryB.revenue > 0 ? 
            (totalCategoryA.revenue / (totalCategoryA.revenue + totalCategoryB.revenue) * 100) : 0
        }
      };
      
      console.log('✅ Report generated successfully:', {
        totalItems: transactionItems?.length || 0,
        categoryA: reportResult.categoryA.total,
        categoryB: reportResult.categoryB.total,
        summary: reportResult.summary,
        dailyCount: reportResult.dailyBreakdown.length
      });
      
      return reportResult;

    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }, []);

  // Function untuk export ke Excel (menggunakan CSV sebagai fallback)
  const exportToExcel = useCallback(async () => {
    setReportLoading(true);
    displayToast('📊 Generating laporan...');

    try {
      const dateRange = getDateRange(selectedPeriod);
      const reportData = await generateReport(dateRange.start, dateRange.end);

      // Create CSV content
      let csvContent = '';
      
      // Header Info
      csvContent += `LAPORAN PENJUALAN\n`;
      csvContent += `Periode: ${reportData.dateRange.label}\n`;
      csvContent += `Generated: ${new Date().toLocaleString('id-ID')}\n`;
      csvContent += `Generated by: ${user.full_name}\n\n`;

      // Summary
      csvContent += `RINGKASAN TOTAL\n`;
      csvContent += `Total Pendapatan,${formatRupiah(reportData.summary.totalRevenue)}\n`;
      csvContent += `Revenue Kategori A (Studio & Cetak),${formatRupiah(reportData.categoryA.total.revenue)}\n`;
      csvContent += `Revenue Kategori B (Minuman & Snack),${formatRupiah(reportData.categoryB.total.revenue)}\n`;
      csvContent += `Total Quantity,${reportData.summary.totalQuantity.toLocaleString('id-ID')} items\n`;
      csvContent += `Total Transaksi,${reportData.summary.totalTransactions.toLocaleString('id-ID')} transaksi\n`;
      csvContent += `Persentase Kategori A,${reportData.summary.categoryAPercentage.toFixed(2)}%\n`;
      csvContent += `Persentase Kategori B,${(100 - reportData.summary.categoryAPercentage).toFixed(2)}%\n\n`;

      // Category A Summary
      csvContent += `KATEGORI A - ${reportData.categoryA.name}\n`;
      csvContent += `Pendapatan,${formatRupiah(reportData.categoryA.total.revenue)}\n`;
      csvContent += `Quantity,${reportData.categoryA.total.quantity.toLocaleString('id-ID')} items\n`;
      csvContent += `Transaksi,${reportData.categoryA.total.transactions.toLocaleString('id-ID')} transaksi\n`;
      csvContent += `Growth Revenue vs Periode Sebelumnya,${reportData.categoryA.growth.revenue.toFixed(2)}%\n`;
      csvContent += `Growth Quantity vs Periode Sebelumnya,${reportData.categoryA.growth.quantity.toFixed(2)}%\n\n`;

      // Category A Details
      csvContent += `DETAIL PRODUK KATEGORI A\n`;
      csvContent += `Nama Produk,Quantity,Revenue,Transaksi,Avg per Transaksi\n`;
      reportData.categoryA.items.forEach(item => {
        csvContent += `${item.name},${item.quantity.toLocaleString('id-ID')},${formatRupiah(item.revenue)},${item.transactions},${formatRupiah(item.avgPerTransaction.toFixed(0))}\n`;
      });
      csvContent += `\n`;

      // Category B Summary
      csvContent += `KATEGORI B - ${reportData.categoryB.name}\n`;
      csvContent += `Pendapatan,${formatRupiah(reportData.categoryB.total.revenue)}\n`;
      csvContent += `Quantity,${reportData.categoryB.total.quantity.toLocaleString('id-ID')} items\n`;
      csvContent += `Transaksi,${reportData.categoryB.total.transactions.toLocaleString('id-ID')} transaksi\n`;
      csvContent += `Growth Revenue vs Periode Sebelumnya,${reportData.categoryB.growth.revenue.toFixed(2)}%\n`;
      csvContent += `Growth Quantity vs Periode Sebelumnya,${reportData.categoryB.growth.quantity.toFixed(2)}%\n\n`;

      // Category B Details
      csvContent += `DETAIL PRODUK KATEGORI B\n`;
      csvContent += `Nama Produk,Quantity,Revenue,Transaksi,Avg per Transaksi\n`;
      reportData.categoryB.items.forEach(item => {
        csvContent += `${item.name},${item.quantity.toLocaleString('id-ID')},${formatRupiah(item.revenue)},${item.transactions},${formatRupiah(item.avgPerTransaction.toFixed(0))}\n`;
      });
      csvContent += `\n`;

      // Daily Breakdown
      csvContent += `BREAKDOWN HARIAN\n`;
      csvContent += `Tanggal,Kategori A Revenue,Kategori A Qty,Kategori A Transaksi,Kategori B Revenue,Kategori B Qty,Kategori B Transaksi,Total Revenue\n`;
      reportData.dailyBreakdown.forEach(day => {
        const totalDaily = day.categoryA.revenue + day.categoryB.revenue;
        csvContent += `${formatDate(new Date(day.date))},${formatRupiah(day.categoryA.revenue)},${day.categoryA.quantity},${day.categoryA.transactions},${formatRupiah(day.categoryB.revenue)},${day.categoryB.quantity},${day.categoryB.transactions},${formatRupiah(totalDaily)}\n`;
      });

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Penjualan_${dateRange.start.split('T')[0]}_${dateRange.end.split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      displayToast('✅ Laporan Excel berhasil didownload!');
      console.log('📊 Report exported successfully:', reportData);

    } catch (error) {
      console.error('❌ Error exporting report:', error);
      displayToast('❌ Gagal generate laporan: ' + error.message);
    } finally {
      setReportLoading(false);
    }
  }, [selectedPeriod, generateReport, getDateRange, user.full_name]);

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
      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#27ae60',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

      {/* CSS Animation for Pulse Effect and Toast */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          @keyframes slideInRight {
            from { transform: translateX(300px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
            <button
              onClick={exportToExcel}
              disabled={reportLoading}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: reportLoading ? '#95a5a6' : '#e67e22',
                color: 'white',
                cursor: reportLoading ? 'not-allowed' : 'pointer',
                marginLeft: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {reportLoading ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Generating...
                </>
              ) : (
                <>📊 Generate Laporan</>
              )}
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

        {/* Realtime Debug Panel */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            background: '#2c3e50',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#ecf0f1' }}>🐛 Debug Realtime</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '10px',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <span>Status:</span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isRealTimeConnected ? '#27ae60' : '#e74c3c',
                  animation: isRealTimeConnected ? 'pulse 2s infinite' : 'none'
                }}></div>
                <span style={{ color: isRealTimeConnected ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                  {isRealTimeConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <span>Last Update:</span>
              <span style={{ fontFamily: 'monospace' }}>
                {lastUpdate.toLocaleString('id-ID')}
              </span>
            </div>
            
            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
              Recent Events ({realtimeEvents.length}/10):
            </div>
            <div style={{
              maxHeight: '150px',
              overflowY: 'auto',
              background: '#34495e',
              padding: '10px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {realtimeEvents.length === 0 ? (
                <div style={{ color: '#7f8c8d', fontStyle: 'italic' }}>
                  Menunggu event realtime...
                </div>
              ) : (
                realtimeEvents.map((event) => (
                  <div key={event.id} style={{ marginBottom: '5px' }}>
                    <span style={{ color: '#95a5a6' }}>
                      [{event.timestamp.toLocaleTimeString('id-ID')}]
                    </span>{' '}
                    <span style={{ color: '#f39c12' }}>{event.event}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 