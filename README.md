# Kasir SnapMe

### 1. Clone Repository

```bash
git clone <repository-url>
cd kasir-snapme
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database (Supabase)

#### Buat akun Supabase:

1. Daftar di [supabase.com](https://supabase.com)
2. Buat project baru
3. Copy URL dan API Key dari Settings > API

#### Buat tabel di Supabase:

Jalankan SQL berikut di SQL Editor Supabase:

```sql
-- Tabel products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO products (name, price, stock) VALUES
('Nasi Goreng', 15000, 50),
('Mie Ayam', 12000, 30),
('Es Teh', 5000, 100),
('Kopi', 8000, 80);
```

### 4. Konfigurasi Environment

Update file `src/supabaseClient.js` dengan kredensial Supabase Anda:

```javascript
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
```

### 5. Jalankan Aplikasi

```bash
npm start
```

Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000)

## 📁 Struktur Project

```
kasir-snapme/
├── src/
│   ├── App.js              # Komponen utama aplikasi
│   ├── App.css             # Styling utama
│   ├── supabaseClient.js   # Konfigurasi database
│   └── index.js            # Entry point
├── public/                 # Static files
├── package.json           # Dependencies
└── README.md              # Dokumentasi
```

## 🎯 Cara Penggunaan

### Manajemen Produk

1. Tambah produk baru dengan mengisi form
2. Edit produk dengan klik tombol edit
3. Hapus produk dengan tombol delete

### Transaksi Kasir

1. Pilih produk dari daftar
2. Atur jumlah di keranjang
3. Klik "Bayar" untuk menyelesaikan transaksi
4. Struk PDF akan otomatis ter-generate

## 🔧 Scripts Available

```bash
npm start      # Jalankan development server
npm test       # Jalankan test suite
npm run build  # Build untuk production
```

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **PDF Generator**: jsPDF
- **Build Tool**: Create React App

## 📝 Troubleshooting

### Error koneksi Supabase

- Pastikan URL dan API key benar
- Cek koneksi internet
- Verifikasi tabel sudah dibuat

### Error saat install dependencies

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 sudah digunakan

```bash
npm start -- --port 3001
```

## 🤝 Contributing

1. Fork repository
2. Buat branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License.

## 📞 Support

Jika ada pertanyaan atau issue, silakan buat issue di repository ini.
