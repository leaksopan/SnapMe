# 📱 WhatsApp Photo Sender Integration - Implementation Roadmap

## 🎯 TUJUAN AKHIR

Sistem semi-otomatis untuk mengirim foto hasil studio ke customer via WhatsApp dengan:

- Auto-fill data customer dari transaksi existing
- Detail pesanan lengkap (items, quantity, total)
- Template message yang customizable
- Free solution menggunakan WhatsApp Link (wa.me)

## 📋 TAHAPAN IMPLEMENTASI

### 🔧 FASE 1: Database Schema Update

```sql
-- Tambah kolom customer_phone di tabel transactions
ALTER TABLE transactions
ADD COLUMN customer_phone VARCHAR(20);

-- Optional: Tambah index untuk performa
CREATE INDEX idx_transactions_customer_phone ON transactions(customer_phone);
```

### 🏪 FASE 2: Update Kasir Form

**File:** `src/pages/Kasir.js` (atau sejenisnya)

**Tambahkan:**

```javascript
// State baru
const [customerPhone, setCustomerPhone] = useState("");

// Input field baru di form
<div className="form-group">
  <label>No HP Customer (opsional untuk kirim foto):</label>
  <input
    type="text"
    placeholder="08123456789 atau 628123456789"
    value={customerPhone}
    onChange={(e) => setCustomerPhone(e.target.value)}
    style={{ marginBottom: "10px" }}
  />
  <small style={{ color: "#666" }}>
    * Opsional - untuk mengirim hasil foto via WhatsApp
  </small>
</div>;

// Update save transaction function
const saveTransaction = async () => {
  const transactionData = {
    customer_name: customerName,
    customer_phone: customerPhone, // ← Tambah field ini
    total_amount: totalAmount,
    payment_method: paymentMethod,
    // ... existing fields
  };

  // Rest of save logic...
};

// Tambah validasi format HP (optional)
const validatePhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return cleanPhone.match(/^(08|628|62|8)/);
};
```

### 📊 FASE 3: Update History Component

**File:** `src/pages/History.js`

**Modifikasi existing query (sudah OK, tidak perlu ubah):**

```javascript
// Query existing sudah perfect:
.select(`
  *,
  users(full_name),
  transaction_items(
    *,
    items(name)  // ← Ini data item yang dibutuhkan
  )
`)
```

**Tambah state baru:**

```javascript
// Tambah di component state
const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
const [selectedTransaction, setSelectedTransaction] = useState(null);
```

**Tambah button di expanded transaction:**

```javascript
// Di dalam {isExpanded && ( ... )} section, tambah:
<div style={{ marginTop: "15px", textAlign: "right" }}>
  {tr.customer_phone ? (
    <button
      onClick={() => handleSendWhatsApp(tr)}
      style={{
        background: "#25D366",
        color: "white",
        padding: "8px 15px",
        borderRadius: "5px",
        border: "none",
        cursor: "pointer",
        fontSize: "0.9rem",
      }}
    >
      📱 Kirim Hasil Foto
    </button>
  ) : (
    <span style={{ color: "#999", fontSize: "0.8rem" }}>
      📞 No HP tidak tersedia
    </span>
  )}
</div>
```

**Tambah handler function:**

```javascript
// Handler untuk buka modal WhatsApp
const handleSendWhatsApp = (transaction) => {
  setSelectedTransaction(transaction);
  setShowWhatsAppModal(true);
};
```

### 🔄 FASE 4: Create WhatsApp Modal Component

**File:** `src/components/WhatsAppModal.js` (buat file baru)

```javascript
import React, { useState } from "react";

const WhatsAppModal = ({ transaction, onClose, show }) => {
  const [driveLink, setDriveLink] = useState("");
  const [extraNote, setExtraNote] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  // Studio config (bisa dipindah ke config file)
  const studioConfig = {
    studioName: "Studio Foto Cemerlang", // ← GANTI SESUAI STUDIO
    studioPhone: "08123456789", // ← GANTI NOMOR STUDIO
    studioAddress: "Jl. Merdeka No. 123", // ← GANTI ALAMAT STUDIO
  };

  // Format rupiah helper
  const formatRupiah = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Generate message dengan detail order
  const generateMessage = () => {
    const itemsList = transaction.transaction_items
      .map(
        (item) =>
          `• ${item.items?.name || "Unknown"} (${
            item.quantity
          }x) - Rp ${formatRupiah(item.subtotal)}`
      )
      .join("\n");

    return `Halo ${transaction.customer_name},

✨ Foto studio ${studioConfig.studioName} sudah siap! 📸

📋 DETAIL PESANAN #${transaction.transaction_number}:
${itemsList}

💰 TOTAL: Rp ${formatRupiah(transaction.total_amount)}
📅 Tanggal: ${new Date(transaction.created_at).toLocaleDateString("id-ID")}

📸 Download foto di link berikut:
${driveLink || "[Link Google Drive]"}

${extraNote ? `📝 Catatan: ${extraNote}\n` : ""}📞 Ada kendala? Hubungi: ${
      studioConfig.studioPhone
    }
📍 Alamat studio: ${studioConfig.studioAddress}

Terima kasih sudah mempercayai ${studioConfig.studioName}! 🙏

Salam hangat,
Tim ${studioConfig.studioName} 📷`;
  };

  // Handle send WhatsApp
  const handleSendWhatsApp = () => {
    if (!driveLink) {
      alert("Mohon isi link Google Drive terlebih dahulu");
      return;
    }

    // Tentukan nomor HP yang akan digunakan
    const phoneToUse = manualPhone || transaction.customer_phone;
    if (!phoneToUse) {
      alert("Mohon isi nomor HP customer");
      return;
    }

    // Format nomor HP
    let formattedPhone = phoneToUse.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("08")) {
      formattedPhone = "628" + formattedPhone.substring(2);
    } else if (formattedPhone.startsWith("8")) {
      formattedPhone = "62" + formattedPhone;
    }

    // Generate message
    const message = generateMessage();

    // Create WhatsApp link
    const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
      message
    )}`;

    // Open WhatsApp
    window.open(whatsappLink, "_blank");

    // Close modal
    onClose();
  };

  if (!show) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "10px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h3>📱 Kirim Hasil Foto via WhatsApp</h3>

        {/* Customer Info */}
        <div
          style={{
            background: "#f8f9fa",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <p>
            <strong>👤 Customer:</strong> {transaction.customer_name}
          </p>
          <p>
            <strong>🧾 Transaksi:</strong> #{transaction.transaction_number}
          </p>
          <p>
            <strong>📞 No HP:</strong>{" "}
            {transaction.customer_phone || "❌ Tidak ada"}
          </p>
          <p>
            <strong>💰 Total:</strong> Rp{" "}
            {formatRupiah(transaction.total_amount)}
          </p>
        </div>

        {/* Manual Phone Input jika HP tidak ada */}
        {!transaction.customer_phone && (
          <div
            style={{
              background: "#fff3cd",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "15px",
            }}
          >
            <p style={{ margin: "0 0 10px", fontWeight: "bold" }}>
              ⚠️ No HP customer tidak tersedia
            </p>
            <input
              type="text"
              placeholder="Input nomor HP customer (08xxx atau 628xxx)"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            />
          </div>
        )}

        {/* Google Drive Link Input */}
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            📁 Link Google Drive Foto:
          </label>
          <input
            type="url"
            placeholder="https://drive.google.com/folder/..."
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ddd",
            }}
            required
          />
        </div>

        {/* Extra Note */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            📝 Catatan Tambahan (opsional):
          </label>
          <textarea
            placeholder="Pesan khusus untuk customer..."
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            rows="3"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ddd",
              resize: "vertical",
            }}
          />
        </div>

        {/* Message Preview */}
        <div
          style={{
            background: "#f8f9fa",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <strong>📝 Preview Pesan:</strong>
          <div
            style={{
              marginTop: "10px",
              whiteSpace: "pre-line",
              fontSize: "0.9rem",
              color: "#2c3e50",
              border: "1px solid #dee2e6",
              padding: "10px",
              borderRadius: "5px",
              background: "white",
            }}
          >
            {generateMessage()}
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              background: "#f8f9fa",
              cursor: "pointer",
            }}
          >
            ❌ Batal
          </button>
          <button
            onClick={handleSendWhatsApp}
            disabled={!driveLink}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              background: driveLink ? "#25D366" : "#ccc",
              color: "white",
              cursor: driveLink ? "pointer" : "not-allowed",
            }}
          >
            📱 Buka WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal;
```

### 🔗 FASE 5: Integrate Modal ke History

**File:** `src/pages/History.js`

**Import modal:**

```javascript
import WhatsAppModal from "../components/WhatsAppModal";
```

**Tambah modal di return JSX (sebelum closing div):**

```javascript
{
  /* WhatsApp Modal */
}
<WhatsAppModal
  transaction={selectedTransaction}
  show={showWhatsAppModal}
  onClose={() => {
    setShowWhatsAppModal(false);
    setSelectedTransaction(null);
  }}
/>;
```

### ⚙️ FASE 6: Configuration System (Optional Enhancement)

**File:** `src/config/studioConfig.js` (buat file baru)

```javascript
export const studioConfig = {
  studioName: "Studio Foto Cemerlang",
  studioPhone: "08123456789",
  studioAddress: "Jl. Merdeka No. 123",
  website: "www.studiocemerlang.com",

  // Template message (bisa dikustomisasi)
  messageTemplate: `Halo {customerName},

✨ Foto studio {studioName} sudah siap! 📸

📋 DETAIL PESANAN #{transactionNumber}:
{itemsList}

💰 TOTAL: Rp {totalAmount}
📅 Tanggal: {transactionDate}

📸 Download foto di link berikut:
{driveLink}

{extraNote}📞 Ada kendala? Hubungi: {studioPhone}
📍 Alamat studio: {studioAddress}

Terima kasih sudah mempercayai {studioName}! 🙏

Salam hangat,
Tim {studioName} 📷`,
};
```

### 🎨 FASE 7: CSS Styling (Optional)

**File:** `src/styles/whatsapp.css` (buat file baru)

```css
/* WhatsApp Modal Styles */
.whatsapp-button {
  background: #25d366;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.3s ease;
}

.whatsapp-button:hover {
  background: #128c7e;
}

.whatsapp-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.customer-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.message-preview {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
}

.message-preview-content {
  margin-top: 10px;
  white-space: pre-line;
  font-size: 0.9rem;
  color: #2c3e50;
  border: 1px solid #dee2e6;
  padding: 10px;
  border-radius: 5px;
  background: white;
}

.phone-warning {
  background: #fff3cd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-input {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}
```

## 🧪 TESTING CHECKLIST

### ✅ Test Skenario:

1. **Transaksi dengan HP**: Buat transaksi → isi HP → cek bisa kirim WA
2. **Transaksi tanpa HP**: Buat transaksi → kosongkan HP → cek input manual
3. **Format HP**: Test berbagai format (08xxx, 628xxx, 8xxx)
4. **Detail order**: Cek apakah semua item muncul di message
5. **Template message**: Cek format dan placeholder
6. **WhatsApp link**: Test buka di browser/mobile

### 🐛 Error Handling:

- Validasi input kosong
- Format nomor HP salah
- Google Drive link tidak valid
- Database connection error
- Modal tidak menutup

## 🚀 DEPLOYMENT NOTES

### Database Migration:

```sql
-- Jalankan sebelum deploy
ALTER TABLE transactions ADD COLUMN customer_phone VARCHAR(20);
```

### Environment Variables (jika pakai config):

```env
REACT_APP_STUDIO_NAME="Studio Foto Cemerlang"
REACT_APP_STUDIO_PHONE="08123456789"
REACT_APP_STUDIO_ADDRESS="Jl. Merdeka No. 123"
```

## 📊 HASIL AKHIR

User bisa:

1. ✅ Input HP customer di kasir (opsional)
2. ✅ Buka History transaksi
3. ✅ Klik "Kirim Hasil Foto" di transaksi yang diinginkan
4. ✅ Input link Google Drive + catatan
5. ✅ Preview message dengan detail order lengkap
6. ✅ Klik "Buka WhatsApp" → langsung buka WA dengan message siap kirim
7. ✅ Customer terima message dengan detail pesanan + link foto

**100% GRATIS, NO API COST, UNLIMITED USAGE! 🎉**

---

## 🔄 FUTURE ENHANCEMENTS (Optional)

- [ ] Template variants untuk jenis foto berbeda
- [ ] History tracking siapa yang kirim WA kapan
- [ ] Bulk send untuk multiple customers
- [ ] Integration dengan Google Drive API
- [ ] Auto-generate foto gallery preview
- [ ] Customer feedback collection
- [ ] Analytics dashboard
