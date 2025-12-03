import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const History = ({ user, onLogout }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState(new Set());
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Filter states
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const formatRupiah = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const loadTransactions = useCallback(async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      let query = supabase.from('transactions').select('*', { count: 'exact', head: true });

      // Apply filters for count
      if (dateRange.from) query = query.gte('created_at', dateRange.from.toISOString());
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }
      if (searchQuery) query = query.ilike('customer_name', `%${searchQuery}%`);
      if (paymentFilter !== 'all') query = query.eq('payment_method', paymentFilter);

      const { count, error: countError } = await query;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get paginated data
      const from = (page - 1) * size;
      const to = from + size - 1;

      let dataQuery = supabase
        .from('transactions')
        .select(`*, users(full_name), transaction_items(*, items(name))`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (dateRange.from) dataQuery = dataQuery.gte('created_at', dateRange.from.toISOString());
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        dataQuery = dataQuery.lte('created_at', endDate.toISOString());
      }
      if (searchQuery) dataQuery = dataQuery.ilike('customer_name', `%${searchQuery}%`);
      if (paymentFilter !== 'all') dataQuery = dataQuery.eq('payment_method', paymentFilter);

      const { data, error } = await dataQuery;
      if (error) throw error;

      setTransactions(data || []);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading transactions:', error);
      alert('Gagal memuat riwayat transaksi: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [pageSize, dateRange, searchQuery, paymentFilter]);

  const handleSelectTransaction = (id) => {
    const newSelected = new Set(selectedTransactions);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedTransactions(
      selectedTransactions.size === transactions.length
        ? new Set()
        : new Set(transactions.map(tr => tr.id))
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0 || user.role !== 'admin') return;
    if (!window.confirm(`Hapus ${selectedTransactions.size} transaksi?`)) return;

    setLoading(true);
    try {
      const ids = Array.from(selectedTransactions);
      await supabase.from('transaction_items').delete().in('transaction_id', ids);
      await supabase.from('transactions').delete().in('id', ids);
      setSelectedTransactions(new Set());
      loadTransactions(currentPage, pageSize);
    } catch (error) {
      alert('Gagal menghapus: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const csvData = transactions.map(tr => ({
      'No Transaksi': tr.transaction_number,
      'Tanggal': format(new Date(tr.created_at), 'dd/MM/yyyy'),
      'Customer': tr.customer_name,
      'Kasir': tr.users?.full_name || '-',
      'Pembayaran': tr.payment_method,
      'Total': tr.total_amount,
      'Items': tr.transaction_items.map(i => `${i.items?.name}(${i.quantity})`).join('; ')
    }));
    const csv = [Object.keys(csvData[0]).join(','), ...csvData.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `transaksi-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleToggleDetails = (id) => {
    const newExpanded = new Set(expandedTransactions);
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedTransactions(newExpanded);
  };

  const resetFilters = () => {
    setDateRange({ from: null, to: null });
    setSearchQuery('');
    setPaymentFilter('all');
  };

  useEffect(() => {
    loadTransactions(1, pageSize);
  }, [dateRange, searchQuery, paymentFilter, pageSize]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const totalAmount = transactions.reduce((sum, tr) => sum + tr.total_amount, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Riwayat Transaksi</h1>
            <p className="text-muted-foreground">Kelola dan pantau semua transaksi</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}</p>
            </div>
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter & Pencarian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rentang Tanggal</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <span className="mr-2">📅</span>
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
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cari Customer</label>
                <Input
                  placeholder="Nama customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Metode Pembayaran</label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Per Halaman</label>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
              <Button onClick={() => loadTransactions(currentPage, pageSize)} disabled={loading}>
                {loading ? '⏳' : '🔄'} Refresh
              </Button>
              <Button variant="outline" onClick={exportToCSV} disabled={!transactions.length}>
                📁 Export CSV
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                ✖️ Reset Filter
              </Button>

              {user.role === 'admin' && selectedTransactions.size > 0 && (
                <Button variant="destructive" onClick={handleDeleteSelected} disabled={loading}>
                  🗑️ Hapus ({selectedTransactions.size})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-muted-foreground text-sm">Total Transaksi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">Rp {formatRupiah(totalAmount)}</div>
              <p className="text-muted-foreground text-sm">Total Halaman Ini</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{transactions.length}</div>
              <p className="text-muted-foreground text-sm">Ditampilkan</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Daftar Transaksi</CardTitle>
              {transactions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Pilih Semua</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Memuat data...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-4xl mb-2">📋</p>
                <p>Tidak ada transaksi ditemukan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tr) => {
                  const isExpanded = expandedTransactions.has(tr.id);
                  const isSelected = selectedTransactions.has(tr.id);

                  return (
                    <div
                      key={tr.id}
                      className={`border rounded-lg transition-all ${isSelected ? 'border-destructive bg-destructive/5' : isExpanded ? 'border-primary' : 'border-border'}`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        {user.role === 'admin' && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectTransaction(tr.id)}
                          />
                        )}

                        <div
                          className="flex-1 cursor-pointer flex items-center justify-between"
                          onClick={() => handleToggleDetails(tr.id)}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">#{tr.transaction_number}</span>
                              <Badge variant={tr.payment_method === 'Cash' ? 'default' : 'secondary'}>
                                {tr.payment_method}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>👤 {tr.customer_name}</span>
                              <span>📅 {format(new Date(tr.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-bold text-green-600">Rp {formatRupiah(tr.total_amount)}</span>
                            <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>⌄</span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t px-4 pb-4 pt-3 bg-muted/30">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                            <div><span className="text-muted-foreground">Kasir:</span> {tr.users?.full_name || '-'}</div>
                            <div><span className="text-muted-foreground">Waktu:</span> {format(new Date(tr.created_at), 'HH:mm:ss')}</div>
                            <div><span className="text-muted-foreground">Items:</span> {tr.transaction_items.length} item</div>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Harga</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tr.transaction_items.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.items?.name || '-'}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-right">Rp {formatRupiah(item.unit_price || 0)}</TableCell>
                                  <TableCell className="text-right font-medium">Rp {formatRupiah(item.subtotal || 0)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          <div className="text-right mt-3 pt-3 border-t">
                            <span className="text-lg font-bold text-green-600">Total: Rp {formatRupiah(tr.total_amount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Halaman {currentPage} dari {totalPages} ({totalCount} transaksi)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTransactions(currentPage - 1, pageSize)}
                    disabled={currentPage === 1 || loading}
                  >
                    ← Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTransactions(currentPage + 1, pageSize)}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;
