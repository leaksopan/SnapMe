// Utility functions untuk analytics dashboard

// Format number ke format rupiah
export const formatRupiah = (num) => {
  return `Rp ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

// Format tanggal ke bahasa Indonesia
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Get current date dalam format Indonesia
export const getCurrentDate = () => {
  return new Date().toLocaleDateString("id-ID", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Calculate percentage change
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Get date range for analytics
export const getDateRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch(period) {
    case 'today':
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      return {
        start: weekStart.toISOString(),
        end: now.toISOString()
      };
    case 'month':
      const monthStart = new Date(today);
      monthStart.setDate(today.getDate() - 30);
      return {
        start: monthStart.toISOString(),
        end: now.toISOString()
      };
    default:
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
  }
};

// Generate sales report data
export const generateSalesReport = (transactions) => {
  const report = {
    totalRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    topCustomers: [],
    dailyBreakdown: []
  };

  if (!transactions || transactions.length === 0) {
    return report;
  }

  // Calculate totals
  report.totalRevenue = transactions.reduce((sum, tr) => sum + tr.total_amount, 0);
  report.totalTransactions = transactions.length;
  report.averageTransaction = report.totalRevenue / report.totalTransactions;

  // Group by customer
  const customerGroups = {};
  transactions.forEach(tr => {
    const customer = tr.customer_name || 'Walk-in';
    if (!customerGroups[customer]) {
      customerGroups[customer] = {
        name: customer,
        totalSpent: 0,
        transactionCount: 0
      };
    }
    customerGroups[customer].totalSpent += tr.total_amount;
    customerGroups[customer].transactionCount += 1;
  });

  report.topCustomers = Object.values(customerGroups)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  return report;
};

// Calculate growth rate
export const calculateGrowthRate = (currentPeriod, previousPeriod) => {
  if (!previousPeriod || previousPeriod.length === 0) return 0;
  
  const currentTotal = currentPeriod.reduce((sum, tr) => sum + tr.total_amount, 0);
  const previousTotal = previousPeriod.reduce((sum, tr) => sum + tr.total_amount, 0);
  
  return calculatePercentageChange(currentTotal, previousTotal);
};

// Get business insights
export const getBusinessInsights = (dashboardData) => {
  const insights = [];
  
  // Revenue insights
  if (dashboardData.todaySales > 1000000) {
    insights.push({
      type: 'success',
      icon: '🎉',
      message: 'Penjualan hari ini sangat baik! Lebih dari 1 juta rupiah.'
    });
  } else if (dashboardData.todaySales === 0) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      message: 'Belum ada penjualan hari ini. Saatnya promosi!'
    });
  }

  // Stock insights
  if (dashboardData.lowStockItems.length > 5) {
    insights.push({
      type: 'warning',
      icon: '📦',
      message: `${dashboardData.lowStockItems.length} produk memiliki stok rendah. Segera lakukan restocking.`
    });
  }

  // Top product insights
  if (dashboardData.topProducts.length > 0) {
    const topProduct = dashboardData.topProducts[0];
    insights.push({
      type: 'info',
      icon: '🏆',
      message: `${topProduct.name} adalah produk terlaris dengan ${topProduct.quantity} unit terjual.`
    });
  }

  // Employee performance insights
  if (dashboardData.employeeStats.length > 1) {
    const topEmployee = dashboardData.employeeStats[0];
    insights.push({
      type: 'success',
      icon: '👑',
      message: `${topEmployee.name} adalah kasir terbaik dengan penjualan ${formatRupiah(topEmployee.revenue)}.`
    });
  }

  return insights;
};

// Export CSV data
export const exportToCsv = (data, filename) => {
  if (data.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }

  const csvContent = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate color palette for charts
export const getChartColors = (index) => {
  const colors = [
    '#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#2c3e50', '#d35400'
  ];
  return colors[index % colors.length];
}; 