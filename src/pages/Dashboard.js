import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { format } from 'date-fns';
import { TrendingUp, DollarSign, ShoppingCart, RefreshCw, Download, Wifi, WifiOff, AlertTriangle, CalendarIcon } from 'lucide-react';

const Dashboard = ({ user }) => {
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
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [appliedDateRange, setAppliedDateRange] = useState({ from: null, to: null });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const formatRupiah = (num) => `Rp ${num?.toLocaleString('id-ID') || 0}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const getCurrentDate = () => new Date().toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' });

  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getDateRangeQuery = useCallback((period) => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    switch (period) {
      case 'today':
        return { start: today.toISOString(), end: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)).toISOString(), label: formatDate(today) };
      case 'week':
        return { start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 7)).toISOString(), end: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)).toISOString(), label: `7 Hari Terakhir` };
      case 'month':
        return { start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30)).toISOString(), end: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)).toISOString(), label: `30 Hari Terakhir` };
      case 'custom':
        if (appliedDateRange.from && appliedDateRange.to) {
          const startDate = new Date(appliedDateRange.from);
          const endDate = new Date(appliedDateRange.to);
          endDate.setHours(23, 59, 59, 999);
          return { start: startDate.toISOString(), end: endDate.toISOString(), label: `${format(startDate, 'dd/MM/yy')} - ${format(endDate, 'dd/MM/yy')}` };
        }
        return { start: today.toISOString(), end: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)).toISOString(), label: formatDate(today) };
      default:
        return { start: today.toISOString(), end: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)).toISOString(), label: formatDate(today) };
    }
  }, [appliedDateRange]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const queryDateRange = getDateRangeQuery(selectedPeriod);

      const { data: periodTransactions } = await supabase.from('transactions').select('total_amount, created_at').gte('created_at', queryDateRange.start).lt('created_at', queryDateRange.end);
      const periodSales = periodTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0;
      const periodCount = periodTransactions?.length || 0;

      const { data: allTransactions } = await supabase.from('transactions').select('total_amount');
      const totalRevenue = allTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0;

      const { data: topProductsData } = await supabase.from('transaction_items').select(`items(id, name, price), quantity`).gte('created_at', queryDateRange.start).lt('created_at', queryDateRange.end);
      const productSales = {};
      topProductsData?.forEach(item => {
        const productId = item.items?.id;
        const productName = item.items?.name || 'Unknown';
        if (productId) {
          if (!productSales[productId]) productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
          productSales[productId].quantity += item.quantity || 0;
          productSales[productId].revenue += (item.items?.price || 0) * (item.quantity || 0);
        }
      });
      const topProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

      const { data: recentTransactions } = await supabase.from('transactions').select(`id, transaction_number, customer_name, total_amount, payment_method, created_at, users(full_name)`).order('created_at', { ascending: false }).limit(10);

      // Sales chart data
      const salesChartData = [];

      if (selectedPeriod === 'today') {
        // Untuk hari ini, tampilkan per jam (00:00 - 23:00)
        const now = new Date();
        const currentHour = now.getHours();

        for (let hour = 0; hour <= currentHour; hour++) {
          const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
          const hourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour + 1, 0, 0);

          const { data: hourTransactions } = await supabase
            .from('transactions')
            .select('total_amount')
            .gte('created_at', hourStart.toISOString())
            .lt('created_at', hourEnd.toISOString());

          salesChartData.push({
            date: `${hour.toString().padStart(2, '0')}:00`,
            revenue: hourTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0,
            transactions: hourTransactions?.length || 0
          });
        }
      } else {
        // Untuk periode lain, tampilkan per hari
        const chartDays = selectedPeriod === 'week' ? 7 : 30;
        for (let i = chartDays - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
          const { data: dayTransactions } = await supabase.from('transactions').select('total_amount').gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString());
          salesChartData.push({
            date: dayStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            revenue: dayTransactions?.reduce((sum, tr) => sum + tr.total_amount, 0) || 0,
            transactions: dayTransactions?.length || 0
          });
        }
      }

      const { data: lowStockData } = await supabase.from('items').select('name, stock, price').lte('stock', 10).order('stock', { ascending: true }).limit(5);

      const { data: employeeData } = await supabase.from('transactions').select(`user_id, total_amount, users(full_name)`).gte('created_at', queryDateRange.start).lt('created_at', queryDateRange.end);
      const employeeStats = {};
      employeeData?.forEach(tr => {
        const userId = tr.user_id;
        if (!employeeStats[userId]) employeeStats[userId] = { name: tr.users?.full_name || 'Unknown', transactions: 0, revenue: 0 };
        employeeStats[userId].transactions += 1;
        employeeStats[userId].revenue += tr.total_amount || 0;
      });
      const topEmployees = Object.values(employeeStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      setDashboardData({ todaySales: periodSales, totalTransactions: periodCount, totalRevenue, topProducts, recentTransactions: recentTransactions || [], salesChart: salesChartData, lowStockItems: lowStockData || [], employeeStats: topEmployees });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard:', error);
      displayToast('❌ Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, getDateRangeQuery]);

  const updateDashboardIncremental = useCallback(async (newTransaction, action = 'INSERT') => {
    const queryDateRange = getDateRangeQuery(selectedPeriod);
    const transactionDate = new Date(newTransaction.created_at);
    const isInCurrentPeriod = transactionDate >= new Date(queryDateRange.start) && transactionDate < new Date(queryDateRange.end);

    if (action === 'INSERT') {
      setDashboardData(prev => ({
        ...prev,
        todaySales: isInCurrentPeriod ? prev.todaySales + (newTransaction.total_amount || 0) : prev.todaySales,
        totalTransactions: isInCurrentPeriod ? prev.totalTransactions + 1 : prev.totalTransactions,
        totalRevenue: prev.totalRevenue + (newTransaction.total_amount || 0),
        recentTransactions: newTransaction.users?.full_name ? [{ ...newTransaction, users: { full_name: newTransaction.users.full_name } }, ...prev.recentTransactions.slice(0, 9)] : prev.recentTransactions
      }));
    } else if (action === 'DELETE') {
      setDashboardData(prev => ({
        ...prev,
        todaySales: isInCurrentPeriod ? prev.todaySales - (newTransaction.total_amount || 0) : prev.todaySales,
        totalTransactions: isInCurrentPeriod ? prev.totalTransactions - 1 : prev.totalTransactions,
        totalRevenue: prev.totalRevenue - (newTransaction.total_amount || 0),
        recentTransactions: prev.recentTransactions.filter(t => t.id !== newTransaction.id)
      }));
    }
    setLastUpdate(new Date());
  }, [selectedPeriod, getDateRangeQuery]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  useEffect(() => {
    const channelName = `dashboard-realtime-${Date.now()}`;
    const subscription = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, async (payload) => {
        displayToast(`🆕 Transaksi baru: ${payload.new?.customer_name || ''}`);
        const { data: fullTransaction } = await supabase.from('transactions').select(`id, transaction_number, customer_name, total_amount, payment_method, created_at, users(full_name)`).eq('id', payload.new.id).single();
        if (fullTransaction) updateDashboardIncremental(fullTransaction, 'INSERT');
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions' }, (payload) => {
        displayToast(`🗑️ Transaksi dihapus`);
        updateDashboardIncremental(payload.old, 'DELETE');
      })
      .subscribe((status) => setIsRealTimeConnected(status === 'SUBSCRIBED'));

    return () => { supabase.removeChannel(subscription); setIsRealTimeConnected(false); };
  }, [updateDashboardIncremental]);

  const handlePeriodChange = (period) => {
    if (period === 'custom') {
      setShowCustomPicker(true);
      if (!dateRange.from) {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        setDateRange({ from: lastWeek, to: today });
      }
    } else {
      setSelectedPeriod(period);
      setShowCustomPicker(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (!dateRange.from || !dateRange.to) {
      displayToast('⚠️ Pilih tanggal mulai dan akhir');
      return;
    }
    setAppliedDateRange(dateRange);
    setSelectedPeriod('custom');
  };

  const generateReport = useCallback(async () => {
    setReportLoading(true);
    displayToast('📊 Generating laporan...');
    try {
      const queryDateRange = getDateRangeQuery(selectedPeriod);

      // Ambil transaksi dengan items berdasarkan periode
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select(`
          id, transaction_number, customer_name, total_amount, payment_method, created_at,
          users(full_name),
          transaction_items(quantity, subtotal, unit_price, items(name, category))
        `)
        .gte('created_at', queryDateRange.start)
        .lt('created_at', queryDateRange.end)
        .order('created_at', { ascending: false });

      // Aggregate product data dari transactions
      const productSales = {};
      transactionsData?.forEach(tr => {
        tr.transaction_items?.forEach(item => {
          const productName = item.items?.name || 'Unknown';
          const category = item.items?.category || 'Lainnya';
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, category, quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity || 0;
          productSales[productName].revenue += item.subtotal || 0;
        });
      });
      const sortedProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);

      // Generate CSV
      let csvContent = `LAPORAN PENJUALAN SNAPME\n`;
      csvContent += `Periode: ${queryDateRange.label}\n`;
      csvContent += `Generated: ${new Date().toLocaleString('id-ID')}\n\n`;

      csvContent += `RINGKASAN\n`;
      csvContent += `Total Pendapatan,${formatRupiah(dashboardData.todaySales)}\n`;
      csvContent += `Total Transaksi,${dashboardData.totalTransactions}\n\n`;

      csvContent += `DETAIL PRODUK\n`;
      csvContent += `Nama,Kategori,Quantity,Revenue\n`;
      sortedProducts.forEach(p => {
        csvContent += `${p.name},${p.category},${p.quantity},${formatRupiah(p.revenue)}\n`;
      });

      csvContent += `\nDETAIL TRANSAKSI\n`;
      csvContent += `No Transaksi,Customer,Kasir,Total,Metode Bayar,Tanggal\n`;
      transactionsData?.forEach(tr => {
        csvContent += `${tr.transaction_number},${tr.customer_name},${tr.users?.full_name || '-'},${formatRupiah(tr.total_amount)},${tr.payment_method},${new Date(tr.created_at).toLocaleString('id-ID')}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fileName = selectedPeriod === 'custom'
        ? `Laporan_${format(new Date(queryDateRange.start), 'ddMMyy')}_${format(new Date(queryDateRange.end), 'ddMMyy')}.csv`
        : `Laporan_${queryDateRange.start.split('T')[0]}.csv`;
      link.download = fileName;
      link.click();
      displayToast('✅ Laporan berhasil didownload!');
    } catch (error) {
      console.error('Report error:', error);
      displayToast('❌ Gagal generate laporan');
    } finally {
      setReportLoading(false);
    }
  }, [selectedPeriod, getDateRangeQuery, dashboardData]);

  const getPeriodText = () => {
    switch (selectedPeriod) {
      case 'today': return 'Hari Ini';
      case 'week': return '7 Hari';
      case 'month': return '30 Hari';
      default: return 'Custom';
    }
  };

  // Calculate growth (mock - compare with previous period)
  const calculateGrowth = () => {
    // Simplified growth calculation
    const growth = Math.random() * 30 - 10; // Random for demo, replace with actual calculation
    return growth.toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang, {user.full_name} • {getCurrentDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isRealTimeConnected ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
            {isRealTimeConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isRealTimeConnected ? 'Live' : 'Offline'}
          </div>
          <span className="text-xs text-muted-foreground">Update: {lastUpdate.toLocaleTimeString('id-ID')}</span>
        </div>
      </div>

      {/* Period Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <ToggleGroup type="single" value={selectedPeriod} onValueChange={handlePeriodChange} variant="outline">
                <ToggleGroupItem value="today">Hari Ini</ToggleGroupItem>
                <ToggleGroupItem value="week">7 Hari</ToggleGroupItem>
                <ToggleGroupItem value="month">30 Hari</ToggleGroupItem>
                <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadDashboardData}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={generateReport} disabled={reportLoading}>
                <Download className="h-4 w-4 mr-1" /> {reportLoading ? 'Loading...' : 'Export'}
              </Button>
            </div>
          </div>
          {showCustomPicker && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
                      ) : format(dateRange.from, 'dd/MM/yyyy')
                    ) : 'Pilih tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range || { from: null, to: null })}
                    numberOfMonths={2}

                  />
                </PopoverContent>
              </Popover>
              <Button size="sm" onClick={handleApplyCustomRange}>Terapkan</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Penjualan {getPeriodText()}</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(dashboardData.todaySales)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{calculateGrowth(dashboardData.todaySales, 'sales')}%</span>
              <span>dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Transaksi</CardDescription>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalTransactions}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{calculateGrowth(dashboardData.totalTransactions, 'transactions')}%</span>
              <span>dari periode sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Pendapatan</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(dashboardData.totalRevenue)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>Akumulasi seluruh transaksi</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Stok Rendah</CardDescription>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.lowStockItems.length}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>Produk perlu restock</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tren Penjualan</CardTitle>
          <CardDescription>Grafik pendapatan {selectedPeriod === 'today' ? 'per jam hari ini' : getPeriodText().toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.salesChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <RechartsTooltip content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">Revenue: {formatRupiah(payload[0].value)}</p>
                        <p className="text-sm text-muted-foreground">Transaksi: {payload[0].payload.transactions}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produk Terlaris</CardTitle>
            <CardDescription>Top 5 produk periode ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.topProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${i === 0 ? 'bg-yellow-500/20 text-yellow-600' : i === 1 ? 'bg-gray-300/20 text-gray-600' : i === 2 ? 'bg-orange-500/20 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} terjual</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{formatRupiah(product.revenue)}</div>
                </div>
              ))}
              {dashboardData.topProducts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
            <CardDescription>10 transaksi terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {dashboardData.recentTransactions.map((tr) => (
                <div key={tr.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{tr.transaction_number}</p>
                    <p className="text-xs text-muted-foreground">{tr.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatRupiah(tr.total_amount)}</p>
                    <Badge variant="outline" className="text-xs">{tr.payment_method}</Badge>
                  </div>
                </div>
              ))}
              {dashboardData.recentTransactions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock & Employee Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stok Rendah</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.lowStockItems.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{item.name}</span>
                    <Badge variant={item.stock === 0 ? 'destructive' : 'warning'} className="text-xs">
                      {item.stock} sisa
                    </Badge>
                  </div>
                ))}
                {dashboardData.lowStockItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">Semua stok aman</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Karyawan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.employeeStats.slice(0, 3).map((emp, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <span className="text-sm">{emp.name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatRupiah(emp.revenue)}</span>
                  </div>
                ))}
                {dashboardData.employeeStats.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">Belum ada data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
