import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { flushSync } from "react-dom";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import { Camera, Image, Users, Coffee, Cookie, CreditCard, Receipt, ChevronDown, Banknote, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";

const Kasir = ({ user }) => {
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerPayment, setCustomerPayment] = useState("");
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [items, setItems] = useState({
    studio: [], addon: [], fotogroup: [], minuman: [], snack: [],
  });
  const itemsPanelRef = useRef(null);
  const scrollPositions = useRef({});
  const [fotogroupPrices, setFotogroupPrices] = useState({});
  const [showPriceInput, setShowPriceInput] = useState(null);

  const formatRupiah = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const getCurrentDate = () => new Date().toLocaleDateString("id-ID", {
    year: "numeric", month: "long", day: "numeric",
  });

  const loadItems = async () => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from("items").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      setItems({
        studio: data.filter((item) => item.category === "studio"),
        addon: data.filter((item) => item.category === "addon"),
        fotogroup: data.filter((item) => item.category === "fotogroup"),
        minuman: data.filter((item) => item.category === "minuman"),
        snack: data.filter((item) => item.category === "snack"),
      });
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const cartItems = useMemo(() => {
    const allItems = [...items.studio, ...items.addon, ...items.fotogroup, ...items.minuman, ...items.snack];
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = allItems.find((i) => i.id === itemId);
        if (!item) return null;
        const effectivePrice = item.category === 'fotogroup' ? (fotogroupPrices[itemId] || 0) : item.price;
        return { ...item, qty, effectivePrice, subtotal: effectivePrice * qty };
      })
      .filter(Boolean);
  }, [cart, items, fotogroupPrices]);

  const totalAmount = useMemo(() => cartItems.reduce((sum, item) => sum + item.subtotal, 0), [cartItems]);
  const changeAmount = useMemo(() => (parseFloat(customerPayment) || 0) - totalAmount, [customerPayment, totalAmount]);

  useEffect(() => { if (paymentMethod !== "Cash") setCustomerPayment(""); }, [paymentMethod]);

  const updateCart = useCallback((itemId, qty) => {
    if (itemsPanelRef.current) {
      const currentScrollTop = itemsPanelRef.current.scrollTop;
      scrollPositions.current.itemsPanel = currentScrollTop;
      flushSync(() => setCart((prev) => ({ ...prev, [itemId]: Math.max(0, qty) })));
      itemsPanelRef.current.scrollTop = currentScrollTop;
    } else {
      setCart((prev) => ({ ...prev, [itemId]: Math.max(0, qty) }));
    }
  }, []);

  const handleAddItem = useCallback((itemId, item) => {
    if (item?.category === 'fotogroup' && !fotogroupPrices[itemId]) {
      setShowPriceInput(itemId);
      return;
    }
    updateCart(itemId, (cart[itemId] || 0) + 1);
  }, [cart, updateCart, fotogroupPrices]);

  const handleSetFotogroupPrice = useCallback((itemId, price) => {
    const numericPrice = parseInt(price) || 0;
    if (numericPrice > 0) {
      setFotogroupPrices(prev => ({ ...prev, [itemId]: numericPrice }));
      updateCart(itemId, (cart[itemId] || 0) + 1);
    }
    setShowPriceInput(null);
  }, [cart, updateCart]);

  const handleRemoveItem = useCallback((e, itemId) => {
    e.preventDefault();
    if ((cart[itemId] || 0) > 0) updateCart(itemId, cart[itemId] - 1);
  }, [cart, updateCart]);

  const generateReceipt = async () => {
    if (!customerName.trim()) return alert("Masukkan nama customer.");
    if (!paymentMethod) return alert("Pilih metode pembayaran.");
    if (cartItems.length === 0) return alert("Keranjang kosong.");

    let payment = totalAmount, change = 0;
    if (paymentMethod === "Cash") {
      payment = parseFloat(customerPayment) || 0;
      change = payment - totalAmount;
      if (payment < totalAmount) return alert(`Pembayaran kurang. Total: Rp ${formatRupiah(totalAmount)}`);
    }

    setLoading(true);
    try {
      const transactionNumber = `TRX-${Date.now()}`;
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          transaction_number: transactionNumber, customer_name: customerName,
          payment_method: paymentMethod, total_amount: totalAmount,
          payment_amount: payment, change_amount: change, user_id: user.id,
        })
        .select().single();
      if (transactionError) throw transactionError;

      const transactionItems = cartItems.map((item) => ({
        transaction_id: transaction.id, item_id: item.id,
        quantity: parseInt(item.qty), unit_price: parseFloat(item.effectivePrice || item.price),
        subtotal: parseFloat(item.subtotal),
      }));
      const { error: itemsError } = await supabase.from("transaction_items").insert(transactionItems);
      if (itemsError) {
        await supabase.from("transactions").delete().eq("id", transaction.id);
        throw itemsError;
      }

      // Generate PDF
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Snap Me Self & Photo Studio", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text("Jalan Nusa Indah, Singaraja", 105, 30, { align: "center" });
      doc.text(`No. Transaksi: ${transactionNumber}`, 20, 50);
      doc.text(`Tanggal: ${getCurrentDate()}`, 20, 60);
      doc.text(`Customer: ${customerName}`, 20, 70);
      doc.text(`Kasir: ${user.full_name}`, 20, 80);
      let yPos = 100;
      cartItems.forEach((item) => {
        doc.text(`${item.name} - ${item.qty} x Rp ${formatRupiah(item.effectivePrice)}`, 20, yPos);
        doc.text(`Rp ${formatRupiah(item.subtotal)}`, 150, yPos);
        yPos += 10;
      });
      doc.setFontSize(14);
      doc.text(`TOTAL: Rp ${formatRupiah(totalAmount)}`, 20, yPos + 15);
      doc.text(`DIBAYAR: Rp ${formatRupiah(payment)}`, 20, yPos + 25);
      doc.text(`KEMBALIAN: Rp ${formatRupiah(change)}`, 20, yPos + 35);
      doc.save(`receipt-${transactionNumber}.pdf`);

      setCart({}); setFotogroupPrices({}); setCustomerName(""); setPaymentMethod(""); setCustomerPayment("");
      alert("Transaksi berhasil!");
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart({}); setFotogroupPrices({}); setShowPriceInput(null); setCustomerPayment("");
  };

  return (
    <div className="dark h-screen flex flex-col bg-background">
      {/* Price Modal */}
      {showPriceInput && (
        <PriceModal
          itemName={[...items.studio, ...items.addon, ...items.fotogroup, ...items.minuman, ...items.snack]
            .find(i => i.id === showPriceInput)?.name || ''}
          onSetPrice={(price) => handleSetFotogroupPrice(showPriceInput, price)}
          onCancel={() => setShowPriceInput(null)}
          formatRupiah={formatRupiah}
        />
      )}

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Items Panel */}
        <Card className="flex-[2] flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Katalog Produk</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-6 pb-6" ref={itemsPanelRef}>
              {itemsLoading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Memuat produk...
                </div>
              ) : (
                <div className="space-y-6">
                  <ItemSection title="Paket Studio" icon={<Camera className="w-4 h-4" />} items={items.studio} cart={cart} fotogroupPrices={fotogroupPrices} onAdd={handleAddItem} onRemove={handleRemoveItem} formatRupiah={formatRupiah} />
                  <ItemSection title="Add-on Cetak" icon={<Image className="w-4 h-4" />} items={items.addon} cart={cart} fotogroupPrices={fotogroupPrices} onAdd={handleAddItem} onRemove={handleRemoveItem} formatRupiah={formatRupiah} />
                  <ItemSection title="Foto Group" icon={<Users className="w-4 h-4" />} items={items.fotogroup} cart={cart} fotogroupPrices={fotogroupPrices} onAdd={handleAddItem} onRemove={handleRemoveItem} formatRupiah={formatRupiah} />
                  <ItemSection title="Minuman" icon={<Coffee className="w-4 h-4" />} items={items.minuman} cart={cart} fotogroupPrices={fotogroupPrices} onAdd={handleAddItem} onRemove={handleRemoveItem} formatRupiah={formatRupiah} />
                  <ItemSection title="Snack" icon={<Cookie className="w-4 h-4" />} items={items.snack} cart={cart} fotogroupPrices={fotogroupPrices} onAdd={handleAddItem} onRemove={handleRemoveItem} formatRupiah={formatRupiah} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Checkout Panel */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Checkout</span>
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive h-7 text-xs">
                  Kosongkan
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Cart Items */}
            <div className="flex-shrink-0 h-32 rounded-lg border bg-muted/50 overflow-auto p-2">
              {cartItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Keranjang kosong
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm bg-background rounded p-2">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.qty} x Rp {formatRupiah(item.effectivePrice)}</div>
                      </div>
                      <div className="font-semibold text-primary">Rp {formatRupiah(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="text-center py-3 rounded-lg bg-primary/10">
              <div className="text-2xl font-bold text-primary">Rp {formatRupiah(totalAmount)}</div>
            </div>

            {/* Form */}
            <div className="flex-1 space-y-3 overflow-auto">
              <div>
                <Label htmlFor="customer">Nama Customer</Label>
                <Input id="customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Masukkan nama..." />
              </div>
              <div>
                <Label>Metode Pembayaran</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {paymentMethod ? (
                        <span className="flex items-center gap-2">
                          {paymentMethod === "Cash" ? <Banknote className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                          {paymentMethod === "Cash" ? "Cash" : "Transfer Bank"}
                        </span>
                      ) : "Pilih metode..."}
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[200px]">
                    <DropdownMenuItem onClick={() => setPaymentMethod("Cash")}>
                      <Banknote className="w-4 h-4 mr-2" /> Cash
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPaymentMethod("Transfer")}>
                      <Building2 className="w-4 h-4 mr-2" /> Transfer Bank
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {paymentMethod === "Cash" && (
                <>
                  <div>
                    <Label>Pembayaran</Label>
                    <Input
                      value={customerPayment ? `Rp ${formatRupiah(customerPayment)}` : ''}
                      onChange={(e) => setCustomerPayment(e.target.value.replace(/\D/g, ''))}
                      placeholder="Jumlah bayar..."
                    />
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {[10000, 20000, 50000, 100000].map(amt => (
                        <Button key={amt} variant="outline" size="sm" className="text-xs h-7"
                          onClick={() => setCustomerPayment(((parseInt(customerPayment) || 0) + amt).toString())}>
                          +{amt / 1000}rb
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCustomerPayment(totalAmount.toString())}>
                        Uang Pas
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 text-destructive" onClick={() => setCustomerPayment('')}>
                        Reset
                      </Button>
                    </div>
                  </div>
                  {customerPayment && (
                    <div className={cn(
                      "text-center py-2 rounded-lg text-sm font-semibold",
                      changeAmount < 0 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"
                    )}>
                      {changeAmount < 0 ? `Kurang Rp ${formatRupiah(Math.abs(changeAmount))}` :
                        changeAmount === 0 ? "Pas" : `Kembalian Rp ${formatRupiah(changeAmount)}`}
                    </div>
                  )}
                </>
              )}
            </div>

            <Button className="w-full" onClick={generateReceipt} disabled={loading}>
              {loading ? "Memproses..." : <><Receipt className="w-4 h-4 mr-2" /> Buat Nota</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Item Section Component
const ItemSection = React.memo(({ title, icon, items, cart, fotogroupPrices, onAdd, onRemove, formatRupiah }) => (
  <div>
    <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2 py-1 bg-muted rounded flex items-center gap-2">{icon} {title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onAdd(item.id, item)}
          onContextMenu={(e) => onRemove(e, item.id)}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none hover:shadow-md",
            cart[item.id] > 0 ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{item.name}</div>
            <div className="text-xs text-primary font-semibold">
              {item.category === 'fotogroup'
                ? (fotogroupPrices[item.id] ? `Rp ${formatRupiah(fotogroupPrices[item.id])}` : "Harga Fleksibel")
                : `Rp ${formatRupiah(item.price)}`}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {item.category === 'fotogroup' && !fotogroupPrices[item.id]
                ? "Click: Set Harga"
                : "Click: +1 | Right Click: -1"}
            </div>
          </div>
          {cart[item.id] > 0 && (
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold ml-2">
              {cart[item.id]}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
));

// Price Modal Component
const PriceModal = ({ itemName, onSetPrice, onCancel, formatRupiah }) => {
  const [price, setPrice] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-center">Set Harga - {itemName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Harga</Label>
            <Input
              value={price ? `Rp ${formatRupiah(price)}` : ''}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="Masukkan harga..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[100000, 200000, 300000, 500000, 750000, 1000000].map(amt => (
              <Button key={amt} variant="outline" size="sm" onClick={() => setPrice(amt.toString())}>
                {amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
            <Button className="flex-1" onClick={() => price && onSetPrice(price)}>Set Harga</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Kasir;
