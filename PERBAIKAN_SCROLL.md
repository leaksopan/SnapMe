# Perbaikan Scroll Position - Stok Management

## Masalah yang Diselesaikan

Setelah melakukan update, penambahan, atau penghapusan item di halaman stok, halaman otomatis kembali ke posisi paling atas. Hal ini mengganggu pengalaman pengguna, terutama saat mengedit beberapa item secara berturut-turut.

## Solusi yang Diimplementasikan

### 1. System Scroll Position Management

- Menambahkan `useRef` untuk menyimpan scroll position (`scrollPositionRef`)
- Menambahkan `containerRef` untuk reference ke container utama
- Fungsi `saveScrollPosition()` untuk menyimpan posisi scroll saat ini
- Fungsi `restoreScrollPosition()` untuk memulihkan posisi scroll

### 2. Implementasi pada Fungsi CRUD

- **handleUpdateItem**: Menyimpan scroll position sebelum update, lalu memulihkannya setelah berhasil
- **handleAddItem**: Menyimpan scroll position sebelum penambahan item, lalu memulihkannya setelah berhasil
- **handleDeleteItem**: Menyimpan scroll position sebelum penghapusan item, lalu memulihkannya setelah berhasil

### 3. Optimisasi dengan flushSync

- Menggunakan `React.flushSync()` untuk memastikan state update terjadi secara sinkron
- Memastikan DOM sudah ter-update sebelum memulihkan scroll position
- Mengurangi flicker dan memastikan konsistensi UI

### 4. Auto-restore dengan useEffect

- Menambahkan `useEffect` yang mendengarkan perubahan pada `items` state
- Otomatis memulihkan scroll position jika ada perubahan data

## Kode yang Ditambahkan

### Import tambahan:

```javascript
import { flushSync } from "react-dom";
```

### State dan Ref tambahan:

```javascript
const scrollPositionRef = useRef(0);
const containerRef = useRef(null);
```

### Fungsi helper:

```javascript
// Save scroll position
const saveScrollPosition = () => {
  scrollPositionRef.current =
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;
};

// Restore scroll position
const restoreScrollPosition = () => {
  setTimeout(() => {
    if (scrollPositionRef.current !== undefined) {
      window.scrollTo({
        top: scrollPositionRef.current,
        left: 0,
        behavior: "instant",
      });
    }
  }, 100);
};
```

### useEffect untuk auto-restore:

```javascript
// Restore scroll position after items update
useEffect(() => {
  if (scrollPositionRef.current > 0) {
    restoreScrollPosition();
  }
}, [items]);
```

## Cara Kerja

1. **Save Position**: Sebelum melakukan operasi CRUD, posisi scroll saat ini disimpan
2. **Execute Operation**: Operasi database (insert/update/delete) dijalankan
3. **Sync Update**: State diupdate menggunakan `flushSync` untuk memastikan sinkronisasi
4. **Restore Position**: Posisi scroll dipulihkan ke posisi semula

## Manfaat

✅ **User Experience Lebih Baik**: Pengguna tidak kehilangan posisi saat mengedit item
✅ **Workflow Lebih Efisien**: Memudahkan editing multiple items tanpa harus scroll ulang
✅ **Konsistensi UI**: Modal edit tetap berfungsi normal dengan posisi yang terjaga
✅ **Performance**: Menggunakan `instant` scroll behavior untuk performa yang lebih baik

## Testing

Untuk menguji perbaikan ini:

1. Buka halaman Stok Management
2. Scroll ke bawah hingga item yang jauh dari atas
3. Lakukan edit item, simpan perubahan
4. Pastikan halaman tidak kembali ke atas, melainkan tetap di posisi semula

## Catatan Teknis

- Menggunakan `setTimeout` dengan delay 100ms untuk memastikan DOM sudah selesai dirender
- Kompatibel dengan berbagai browser (fallback untuk `scrollTop` properties)
- Tidak mempengaruhi fungsionalitas modal atau form yang sudah ada
- Tetap mempertahankan semua toast notification dan feedback yang ada
