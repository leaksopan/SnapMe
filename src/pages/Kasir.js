import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';

const Kasir = ({ user, onLogout, sidebarOpen }) => {
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [customerPayment, setCustomerPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
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

  // Check if item has unlimited stock (studio dan addon)
  const isUnlimitedStock = (category) => {
    return category === 'studio' || category === 'addon';
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
    console.time('⚡ Kasir Items Load');
    setItemsLoading(true);
    
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
      console.log(`✅ Kasir: ${data.length} items loaded successfully`);
      
    } catch (error) {
      console.error('❌ Kasir: Error loading items:', error);
      alert('Gagal memuat data items');
    } finally {
      setItemsLoading(false);
      console.timeEnd('⚡ Kasir Items Load');
    }
  };

  // Load items on component mount
  useEffect(() => {
    loadItems();
  }, []);

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

  // Calculate change amount
  const changeAmount = useMemo(() => {
    const payment = parseFloat(customerPayment) || 0;
    return payment - totalAmount;
  }, [customerPayment, totalAmount]);

  // Get cart items for display (now using memoized version)
  const getCartItems = useCallback(() => cartItems, [cartItems]);

  // Calculate total (now using memoized version)
  const calculateTotal = useCallback(() => totalAmount, [totalAmount]);

  // Handle payment method change - clear customer payment if not cash
  useEffect(() => {
    if (paymentMethod !== 'Cash') {
      setCustomerPayment('');
    }
  }, [paymentMethod]);

  // Format customer payment input
  const handleCustomerPaymentChange = (e) => {
    // Remove all non-numeric characters (including "Rp", spaces, dots, etc.)
    const value = e.target.value.replace(/[^\d]/g, '');
    setCustomerPayment(value);
  };

  // Format payment display
  const formatPaymentDisplay = (value) => {
    if (!value) return '';
    return formatRupiah(parseInt(value));
  };

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

  // Handle single click to add item
  const handleAddItem = useCallback((itemId) => {
    const currentQty = cart[itemId] || 0;
    updateCart(itemId, currentQty + 1);
  }, [cart, updateCart]);

  // Handle right click to remove item
  const handleRemoveItem = useCallback((e, itemId) => {
    e.preventDefault(); // Prevent context menu from appearing
    const currentQty = cart[itemId] || 0;
    if (currentQty > 0) {
      updateCart(itemId, currentQty - 1);
    }
  }, [cart, updateCart]);

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

    if (getCartItems().length === 0) {
      alert('Keranjang masih kosong. Silakan pilih item terlebih dahulu.');
      return;
    }

    // Validate customer payment for Cash only
    const total = calculateTotal();
    let payment = total; // Default to total for non-cash payments
    let change = 0; // Default to 0 for non-cash payments
    
    if (paymentMethod === 'Cash') {
      payment = parseFloat(customerPayment) || 0;
      change = payment - total;
      
      if (payment < total) {
        alert(`Pembayaran tidak cukup. Total: Rp ${formatRupiah(total)}, Dibayar: Rp ${formatRupiah(payment)}`);
        return;
      }
    }

    setLoading(true);

    try {
      console.log('📝 Starting transaction process...');
      
      // Generate transaction number
      const transactionNumber = `TRX-${Date.now()}`;
      
      // Save transaction to database
      console.log('💾 Saving transaction...');
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumber,
          customer_name: customerName,
          payment_method: paymentMethod,
          total_amount: calculateTotal(),
          payment_amount: payment, // Use calculated payment amount
          change_amount: change, // Use calculated change amount
          user_id: user.id
        })
        .select()
        .single();

      if (transactionError) {
        console.error('❌ Transaction Error:', transactionError);
        throw transactionError;
      }

      console.log('✅ Transaction saved:', transaction);

      // Prepare transaction items data with proper validation
      const cartItems = getCartItems();
      console.log('📦 Cart items:', cartItems);
      
      const transactionItems = cartItems.map(item => ({
        transaction_id: transaction.id,
        item_id: item.id,
        quantity: parseInt(item.qty),
        unit_price: parseFloat(item.price),
        subtotal: parseFloat(item.subtotal)
      }));

      console.log('📋 Transaction items to insert:', transactionItems);

      // Save transaction items with better error handling
      const { data: insertedItems, error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)
        .select();

      if (itemsError) {
        console.error('❌ Items Error:', itemsError);
        // Rollback transaction if items fail
        await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id);
        throw itemsError;
      }

      console.log('✅ Transaction items saved:', insertedItems);

      // Generate PDF receipt
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('SnapMe Studio', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Jl. Contoh No. 123, Jakarta', 105, 30, { align: 'center' });
      doc.text('Telp: 021-12345678', 105, 40, { align: 'center' });
      
      // Transaction info
      doc.text(`No. Transaksi: ${transactionNumber}`, 20, 60);
      doc.text(`Tanggal: ${getCurrentDate()}`, 20, 70);
      doc.text(`Customer: ${customerName}`, 20, 80);
      doc.text(`Kasir: ${user.full_name}`, 20, 90);
      doc.text(`Pembayaran: ${paymentMethod}`, 20, 100);
      
      // Items
      doc.text('Items:', 20, 120);
      let yPos = 130;
      
      getCartItems().forEach(item => {
        doc.text(`${item.name}`, 20, yPos);
        doc.text(`${item.qty} x Rp ${formatRupiah(item.price)}`, 20, yPos + 10);
        doc.text(`Rp ${formatRupiah(item.subtotal)}`, 150, yPos + 5);
        yPos += 25;
      });
      
      // Total
      doc.setFontSize(14);
      doc.text(`TOTAL: Rp ${formatRupiah(calculateTotal())}`, 20, yPos + 20);
      doc.text(`DIBAYAR: Rp ${formatRupiah(payment)}`, 20, yPos + 35);
      doc.text(`KEMBALIAN: Rp ${formatRupiah(change)}`, 20, yPos + 50);
      
      // Footer
      doc.setFontSize(10);
      doc.text('Terima kasih atas kunjungan Anda!', 105, yPos + 70, { align: 'center' });
      
      // Save PDF
      doc.save(`receipt-${transactionNumber}.pdf`);

      // Clear form
      setCart({});
      setCustomerName('');
      setPaymentMethod('');
      setCustomerPayment(''); // Clear customer payment
      
      console.log('🎉 Transaction completed successfully');
      alert('Transaksi berhasil disimpan dan nota telah diunduh!');
      
    } catch (error) {
      console.error('❌ Error generating receipt:', error);
      let errorMessage = 'Gagal menyimpan transaksi';
      
      // Provide more specific error messages
      if (error.message.includes('violates foreign key constraint')) {
        errorMessage = 'Gagal menyimpan: Ada masalah dengan data item yang dipilih';
      } else if (error.message.includes('violates not-null constraint')) {
        errorMessage = 'Gagal menyimpan: Ada data yang wajib diisi masih kosong';
      } else if (error.message) {
        errorMessage = `Gagal menyimpan transaksi: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = () => {
    setCart({});
    setCustomerPayment(''); // Also clear customer payment when clearing cart
  };

  // Memoized ItemSection component to prevent unnecessary re-renders
  const ItemSection = React.memo(({ title, itemList, icon }) => (
    <div style={{ marginBottom: '25px' }}>
      <h3 style={{
        fontSize: '1.1rem',
        color: '#2c3e50',
        marginBottom: '15px',
        padding: '10px',
        background: '#f8f9fa',
        borderRadius: '6px',
        borderLeft: '4px solid #3498db'
      }}>
        <span style={{marginRight: '10px'}}>{icon}</span>
        {title}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '10px'
      }}>
        {itemList.map(item => (
          <div 
            key={item.id} 
            onClick={() => handleAddItem(item.id)}
            onContextMenu={(e) => handleRemoveItem(e, item.id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: cart[item.id] > 0 ? '#e8f5e8' : 'white',
              border: cart[item.id] > 0 ? '2px solid #27ae60' : '1px solid #ddd',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.9rem' }}>
                {item.name}
              </div>
              <div style={{ color: '#27ae60', fontWeight: '600', fontSize: '0.8rem' }}>
                Rp {formatRupiah(item.price)}
              </div>
              <div style={{ 
                color: '#7f8c8d', 
                fontSize: '0.7rem', 
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                Click: +1 | Right Click: -1
              </div>
            </div>
            {cart[item.id] > 0 && (
              <div style={{
                background: '#27ae60',
                color: 'white',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}>
                {cart[item.id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  ));

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8f9fa'
    }}>
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '20px',
        padding: '20px',
        overflow: 'hidden'
      }}>
        {/* Items Panel */}
        <div style={{
          flex: 2,
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          overflow: 'auto',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }} ref={itemsPanelRef}>
          {itemsLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: '#7f8c8d'
            }}>
              <div className="loading" style={{ margin: '0 auto 20px' }}></div>
              <p style={{ fontSize: '1.1rem', margin: 0 }}>⚡ Memuat katalog produk...</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Checkout Panel */}
        <div style={{
          flex: 1,
          minWidth: '320px',
          maxWidth: '380px',
          width: '100%',
          background: 'white',
          borderRadius: '8px',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          height: 'calc(100vh - 40px)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            borderBottom: '2px solid #3498db',
            paddingBottom: '15px',
            marginBottom: '20px',
            flexShrink: 0
          }}>
            <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.3rem' }}>
              💳 Checkout
            </h3>
          </div>

          {/* Cart Summary - Fixed Height */}
          <div style={{ 
            marginBottom: '10px',
            flexShrink: 0,
            height: '160px'
          }}>
            <div style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '8px'
            }}>
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
              padding: '12px',
              height: '120px',
              overflowY: 'auto',
              border: '1px solid #ecf0f1'
            }}>
              {getCartItems().length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center', 
                  color: '#7f8c8d'
                }}>
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
                      fontSize: '0.9rem',
                      minHeight: '50px'
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

          {/* Form Section - Flex grow to fill remaining space */}
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0,
            pointerEvents: 'auto',
            overflow: 'hidden'
          }}>
            {/* Scrollable form area */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              overflowY: 'auto',
              paddingRight: '4px',
              marginRight: '-4px'
            }}>
              {/* Customer Name Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50' }}>
                  👤 Nama Customer:
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    maxWidth: '100%'
                  }}
                />
              </div>

              {/* Total Amount Display */}
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#27ae60' }}>
                  Rp {formatRupiah(calculateTotal())}
                </div>
              </div>

              {/* Payment Method Dropdown */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50' }}>
                  💰 Metode Pembayaran:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '0.9rem',
                    minHeight: '36px',
                    boxSizing: 'border-box',
                    background: 'white',
                    maxWidth: '100%'
                  }}
                >
                  <option value="">Pilih metode pembayaran</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Transfer">🏦 Transfer Bank</option>
                </select>
              </div>

              {/* Customer Payment Input - Only show for Cash payment */}
              {paymentMethod === 'Cash' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50' }}>
                    💵 Pembayaran Customer:
                  </label>
                  <input
                    type="text"
                    value={customerPayment ? `Rp ${formatRupiah(customerPayment)}` : ''}
                    onChange={handleCustomerPaymentChange}
                    placeholder="Masukkan jumlah pembayaran..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      maxWidth: '100%'
                    }}
                  />
                  
                  {/* Payment Shortcut Buttons */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '6px',
                      marginBottom: '6px'
                    }}>
                      {[5000, 10000, 25000, 50000, 100000, 200000, 500000].map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            const currentAmount = parseInt(customerPayment) || 0;
                            const newAmount = currentAmount + amount;
                            setCustomerPayment(newAmount.toString());
                          }}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #3498db',
                            background: 'white',
                            color: '#3498db',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#f8f9fa';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                          }}
                        >
                          +{amount >= 1000000 ? `${amount/1000000}jt` : `${amount/1000}rb`}
                        </button>
                      ))}
                    </div>
                    
                    {/* Action Buttons Row */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '6px',
                      marginBottom: '6px'
                    }}>
                      {/* Uang Pas Button */}
                      <button
                        type="button"
                        onClick={() => setCustomerPayment(calculateTotal().toString())}
                        style={{
                          padding: '8px 10px',
                          border: '1px solid #27ae60',
                          background: customerPayment === calculateTotal().toString() ? '#27ae60' : 'white',
                          color: customerPayment === calculateTotal().toString() ? 'white' : '#27ae60',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (customerPayment !== calculateTotal().toString()) {
                            e.target.style.background = '#f8fff8';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (customerPayment !== calculateTotal().toString()) {
                            e.target.style.background = 'white';
                          }
                        }}
                      >
                        💰 Uang Pas
                      </button>
                      
                      {/* Clear Button */}
                      <button
                        type="button"
                        onClick={() => setCustomerPayment('')}
                        style={{
                          padding: '8px 10px',
                          border: '1px solid #e74c3c',
                          background: 'white',
                          color: '#e74c3c',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#ffeaea';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'white';
                        }}
                      >
                        🗑️ Reset
                      </button>
                    </div>
                  </div>

                  {customerPayment && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#7f8c8d', 
                      marginTop: '4px',
                      fontStyle: 'italic'
                    }}>
                      Nilai: {customerPayment}
                    </div>
                  )}
                </div>
              )}

              {/* Change Amount Display - Only show for Cash payment */}
              {paymentMethod === 'Cash' && customerPayment && (
                <div style={{
                  background: changeAmount < 0 ? '#ffebee' : changeAmount === 0 ? '#f3e5f5' : '#e8f5e8',
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: changeAmount < 0 ? '1px solid #e74c3c' : changeAmount === 0 ? '1px solid #9c27b0' : '1px solid #27ae60'
                }}>
                  {changeAmount < 0 ? (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e74c3c', marginBottom: '2px' }}>
                        ⚠️ Pembayaran Kurang
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#e74c3c' }}>
                        Rp {formatRupiah(Math.abs(changeAmount))}
                      </div>
                    </div>
                  ) : changeAmount === 0 ? (
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#9c27b0' }}>
                      ✅ Pembayaran Pas
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#27ae60', marginBottom: '2px' }}>
                        💰 Kembalian
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#27ae60' }}>
                        Rp {formatRupiah(changeAmount)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button - Always visible at bottom */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                generateReceipt();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              disabled={loading}
              style={{
                width: '100%',
                minHeight: '44px',
                background: loading ? '#bdc3c7' : '#27ae60',
                color: 'white',
                border: 'none',
                padding: '12px 15px',
                borderRadius: '5px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                flexShrink: 0,
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 100,
                outline: 'none',
                userSelect: 'none',
                pointerEvents: 'auto',
                display: 'block',
                textAlign: 'center',
                marginTop: '8px'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    display: 'inline-block',
                    marginRight: '6px'
                  }}></div>
                  Memproses...
                </>
              ) : (
                '🧾 Buat Nota & Cetak'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kasir; 