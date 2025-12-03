# 📋 TODO: Landing Page SnapMe Studio

## 🎯 Overview
Landing page dengan struktur: **Nav + Announce Banner + Paket** (main page), **Gallery** (tab terpisah dengan filter), dan **Floating Button** untuk contact.

---

## 📦 PHASE 1: Setup & Dependencies

### 1.1 Install ShadCN UI
- [ ] Install ShadCN UI ke project
  ```bash
  npx shadcn@latest init
  ```
- [ ] Pilih Tailwind CSS sebagai base (sudah ada di project)
- [ ] Konfigurasi theme colors sesuai branding SnapMe (blue theme)
- [ ] Install komponen yang diperlukan (sekali jalan):
  ```bash
  npx shadcn@latest add @shadcn/card @shadcn/button @shadcn/tabs @shadcn/alert @shadcn/select @shadcn/skeleton @shadcn/dialog
  ```
  - [ ] `card` - untuk paket cards (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
  - [ ] `button` - untuk CTA buttons (dependencies: @radix-ui/react-slot)
  - [ ] `tabs` - untuk navigation tab (Tabs, TabsList, TabsTrigger, TabsContent) - dependencies: @radix-ui/react-tabs
  - [ ] `dialog` - untuk modal booking (Dialog, DialogTrigger, DialogContent, dll) - dependencies: @radix-ui/react-dialog
  - [ ] `skeleton` - untuk loading states
  - [ ] `select` - untuk filter dropdown (Select, SelectTrigger, SelectContent, SelectItem) - dependencies: @radix-ui/react-select
  - [ ] `alert` - untuk announce banner (Alert, AlertTitle, AlertDescription)

### 1.2 Update Tailwind Config
- [ ] Update `tailwind.config.js` dengan color palette SnapMe:
  ```js
  colors: {
    primary: {
      500: '#2563eb',
      600: '#1d4ed8',
      700: '#1e40af',
      800: '#1e3a8a',
    },
    // ... sesuai REBRANDING_GUIDE.md
  }
  ```

### 1.3 Install Additional Dependencies
- [ ] Install `lucide-react` untuk icons:
  ```bash
  npm install lucide-react
  ```
- [ ] Install `clsx` dan `tailwind-merge` (biasanya sudah include dengan ShadCN):
  ```bash
  npm install clsx tailwind-merge
  ```
- [ ] Install Radix UI dependencies (akan otomatis terinstall saat add shadcn components):
  - `@radix-ui/react-slot` (untuk button)
  - `@radix-ui/react-tabs` (untuk tabs)
  - `@radix-ui/react-dialog` (untuk dialog)
  - `@radix-ui/react-select` (untuk select)

---

## 🏗️ PHASE 2: Database Schema & API

### 2.1 Review Database Structure
- [ ] Review tabel `items` di Supabase (sudah ada):
  - **Kolom yang tersedia:**
    - `id` (SERIAL PRIMARY KEY)
    - `name` (VARCHAR) - nama paket
    - `category` (VARCHAR) - kategori: 'studio', 'addon', 'fotogroup', 'minuman', 'snack'
    - `price` (INTEGER) - harga paket
    - `stock` (INTEGER) - stok (0 untuk unlimited untuk studio)
    - `image_url` (TEXT) - URL gambar paket (dari Supabase Storage atau external URL)
    - `duration` (VARCHAR) - durasi sesi (optional)
    - `is_active` (BOOLEAN) - status aktif
    - `created_at` (TIMESTAMP)
  - **Query untuk paket studio:**
    ```js
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('category', 'studio')
      .eq('is_active', true)
      .order('name');
    ```
- [ ] Buat tabel `gallery` (jika belum ada):
  ```sql
  CREATE TABLE gallery (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    package_id INTEGER REFERENCES items(id),
    title VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Buat tabel `announcements` (untuk announce banner):
  ```sql
  CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info', -- info, warning, success
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

### 2.2 Create API Functions
- [ ] Buat `src/utils/api/packages.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  export const getPackages = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('category', 'studio')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  };
  
  export const getPackageById = async (id) => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('category', 'studio')
      .single();
    
    if (error) throw error;
    return data;
  };
  ```
  
- [ ] Buat `src/utils/api/gallery.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  export const getGalleryImages = async () => {
    const { data, error } = await supabase
      .from('gallery')
      .select('*, items(id, name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  };
  
  export const getGalleryByPackage = async (packageId) => {
    const { data, error } = await supabase
      .from('gallery')
      .select('*, items(id, name)')
      .eq('package_id', packageId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  };
  ```
  
- [ ] Buat `src/utils/api/announcements.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  export const getActiveAnnouncements = async () => {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return data?.[0] || null;
  };
  ```

---

## 🎨 PHASE 3: Component Structure

### 3.1 Layout Components
- [ ] Buat `src/components/landing/LandingLayout.js`:
  - [ ] Wrapper untuk landing page
  - [ ] Container dengan max-width responsive
  - [ ] Background styling sesuai branding

### 3.2 Navigation Component
- [ ] Buat `src/components/landing/LandingNav.js`:
  - [ ] Logo SnapMe (gunakan SnapMeLogo component)
  - [ ] Menu items: Paket, Gallery
  - [ ] Sticky navigation (optional)
  - [ ] Mobile responsive (hamburger menu)
  - [ ] Styling: background putih dengan shadow, text biru

### 3.3 Announce Banner Component
- [ ] Buat `src/components/landing/AnnounceBanner.js`:
  - [ ] Fetch active announcements dari Supabase menggunakan `getActiveAnnouncements()`
  - [ ] Display banner di top (setelah nav) menggunakan ShadCN Alert:
    ```jsx
    <Alert className="border-primary-200 bg-primary-50">
      <AlertCircle className="h-4 w-4 text-primary-600" />
      <AlertTitle>{announcement.title}</AlertTitle>
      <AlertDescription>{announcement.message}</AlertDescription>
    </Alert>
    ```
  - [ ] Support multiple types: info (default), warning, success
  - [ ] Close button (optional) - bisa hide dengan state
  - [ ] Auto-hide jika ada end_date (sudah dihandle di API)
  - [ ] Styling: menggunakan ShadCN Alert component dengan blue theme variants

### 3.4 Package Card Component
- [ ] Buat `src/components/landing/PackageCard.js`:
  - [ ] Props: `package` (data dari Supabase items table)
  - [ ] Display menggunakan ShadCN Card:
    ```jsx
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <img src={package.image_url} alt={package.name} />
        <CardTitle>{package.name}</CardTitle>
        <CardDescription>Durasi: {package.duration || 'Flexible'}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-primary-600">
          Rp {formatRupiah(package.price)}
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Pilih Paket</Button>
      </CardFooter>
    </Card>
    ```
  - [ ] CTA button: "Pilih Paket" → redirect ke booking (nanti)
  - [ ] Hover effects: scale(1.02), shadow-lg
  - [ ] Styling: ShadCN Card dengan blue accent border

### 3.5 Package Grid Component
- [ ] Buat `src/components/landing/PackageGrid.js`:
  - [ ] Grid layout: 3 columns (desktop), 2 (tablet), 1 (mobile)
  - [ ] Loading state: Skeleton components
  - [ ] Empty state: message jika tidak ada paket
  - [ ] Fetch packages dari Supabase
  - [ ] Filter: hanya `category='studio'` dan `is_active=true`

### 3.6 Gallery Component
- [ ] Buat `src/components/landing/Gallery.js`:
  - [ ] Grid layout untuk images
  - [ ] Lightbox/modal untuk preview image
  - [ ] Filter dropdown: filter per Katalog Paket Studio
  - [ ] Fetch gallery images dari Supabase
  - [ ] Group by package_id untuk filter
  - [ ] Styling: masonry grid atau uniform grid

### 3.7 Gallery Filter Component
- [ ] Buat `src/components/landing/GalleryFilter.js`:
  - [ ] Dropdown select menggunakan ShadCN Select:
    ```jsx
    <Select onValueChange={handleFilterChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Semua Paket" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Paket</SelectItem>
        {packages.map(pkg => (
          <SelectItem key={pkg.id} value={pkg.id.toString()}>
            {pkg.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    ```
  - [ ] Fetch packages dari `getPackages()` untuk populate dropdown
  - [ ] Option: "Semua Paket" (default value="all")
  - [ ] Filter logic: filter gallery berdasarkan package_id atau show all
  - [ ] Styling: ShadCN Select component dengan blue accent

### 3.8 Floating Contact Button
- [ ] Buat `src/components/landing/FloatingContactButton.js`:
  - [ ] Fixed position: bottom-right
  - [ ] Icon: WhatsApp atau Message icon
  - [ ] Click: buka WhatsApp link atau contact form
  - [ ] Styling: blue gradient dengan shadow
  - [ ] Visible di halaman Paket dan Gallery
  - [ ] Mobile responsive

---

## 📄 PHASE 4: Pages

### 4.1 Landing Page (Main)
- [ ] Buat `src/pages/Landing.js`:
  - [ ] Import: LandingNav, AnnounceBanner, PackageGrid, FloatingContactButton
  - [ ] Layout structure:
    ```
    <LandingLayout>
      <LandingNav />
      <AnnounceBanner />
      <main>
        <PackageGrid />
      </main>
      <FloatingContactButton />
    </LandingLayout>
    ```
  - [ ] Styling: background putih/light gray

### 4.2 Gallery Page (Tab)
- [ ] Buat `src/pages/LandingGallery.js`:
  - [ ] Import: LandingNav, AnnounceBanner, Gallery, GalleryFilter, FloatingContactButton
  - [ ] Layout structure:
    ```
    <LandingLayout>
      <LandingNav />
      <AnnounceBanner />
      <main>
        <GalleryFilter />
        <Gallery />
      </main>
      <FloatingContactButton />
    </LandingLayout>
    ```

### 4.3 Tab Navigation
- [ ] Buat `src/components/landing/LandingTabs.js`:
  - [ ] Tabs: "Paket" dan "Gallery"
  - [ ] Routing: switch antara Landing.js dan LandingGallery.js
  - [ ] Active state styling: blue underline
  - [ ] Styling: ShadCN Tabs component

---

## 🎨 PHASE 5: Styling & Theming

### 5.1 Color System
- [ ] Update ShadCN theme dengan SnapMe colors:
  - [ ] Primary: `#2563eb`
  - [ ] Secondary: `#64748b`
  - [ ] Accent: `#1e3a8a`
  - [ ] Background: `#f8fafc`
- [ ] Pastikan semua komponen menggunakan theme colors

### 5.2 Typography
- [ ] Headings: font-bold, color `#1e3a8a`
- [ ] Body: color `#475569`
- [ ] Links: color `#2563eb` dengan hover `#1d4ed8`

### 5.3 Spacing & Layout
- [ ] Container: max-width 1200px-1400px
- [ ] Section padding: 60px-80px (desktop), 40px (mobile)
- [ ] Card gap: 24px-32px
- [ ] Border radius: 12px untuk cards, 8px untuk buttons

### 5.4 Shadows & Effects
- [ ] Card shadow: `0 4px 15px rgba(37, 99, 235, 0.1)`
- [ ] Hover shadow: `0 8px 25px rgba(37, 99, 235, 0.2)`
- [ ] Button hover: scale(1.02), transition 0.3s ease

---

## 🔗 PHASE 6: Integration & Routing

### 6.1 Update App.js Routing
- [ ] Tambahkan route untuk landing page:
  - [ ] `/` → Landing.js (main page dengan paket)
  - [ ] `/gallery` → LandingGallery.js
- [ ] Pastikan routing tidak conflict dengan admin routes

### 6.2 Supabase Integration
- [ ] Test fetch packages dari `items` table:
  ```js
  const { data } = await supabase
    .from('items')
    .select('*')
    .eq('category', 'studio')
    .eq('is_active', true)
    .order('name');
  ```
- [ ] Test fetch gallery images
- [ ] Test fetch announcements
- [ ] Error handling untuk semua API calls

### 6.3 Image Optimization
- [ ] Pastikan semua images menggunakan Supabase Storage URLs
- [ ] Implement lazy loading untuk images
- [ ] Fallback image jika image_url null

---

## 📱 PHASE 7: Responsive Design

### 7.1 Mobile (< 768px)
- [ ] Navigation: hamburger menu
- [ ] Package grid: 1 column
- [ ] Gallery grid: 2 columns
- [ ] Announce banner: full width, smaller padding
- [ ] Floating button: smaller size

### 7.2 Tablet (768px - 1024px)
- [ ] Package grid: 2 columns
- [ ] Gallery grid: 3 columns
- [ ] Navigation: horizontal menu

### 7.3 Desktop (> 1024px)
- [ ] Package grid: 3 columns
- [ ] Gallery grid: 4 columns
- [ ] Full navigation menu

---

## ✨ PHASE 8: Polish & Enhancements

### 8.1 Loading States
- [ ] Skeleton loaders untuk packages
- [ ] Skeleton loaders untuk gallery
- [ ] Loading spinner untuk API calls

### 8.2 Empty States
- [ ] Empty state untuk tidak ada paket
- [ ] Empty state untuk tidak ada gallery images
- [ ] Empty state untuk filter tidak ada hasil

### 8.3 Animations
- [ ] Fade-in animation untuk cards saat load
- [ ] Smooth transitions untuk hover effects
- [ ] Smooth scroll untuk navigation

### 8.4 Accessibility
- [ ] Alt text untuk semua images
- [ ] ARIA labels untuk buttons
- [ ] Keyboard navigation support
- [ ] Focus states yang jelas

---

## 🧪 PHASE 9: Testing

### 9.1 Functionality Testing
- [ ] Test fetch packages dari Supabase
- [ ] Test filter gallery per paket
- [ ] Test announce banner display
- [ ] Test floating button click
- [ ] Test navigation tabs
- [ ] Test responsive breakpoints

### 9.2 Error Handling
- [ ] Test jika Supabase connection error
- [ ] Test jika tidak ada data
- [ ] Test jika image_url null/empty
- [ ] Test jika announcement tidak ada

### 9.3 Performance
- [ ] Test loading time
- [ ] Test image loading optimization
- [ ] Test lazy loading
- [ ] Test bundle size

---

## 📝 NOTES

### Database Tables Reference:
- **items** (SUDAH ADA): 
  - Paket studio: `category='studio'` dan `is_active=true`
  - Kolom: id, name, category, price, stock, image_url, duration, is_active, created_at
- **gallery** (PERLU DIBUAT): 
  - Gallery images dengan package_id untuk filter
  - Kolom: id, image_url, package_id (FK ke items.id), title, description, is_active, created_at
- **announcements** (PERLU DIBUAT): 
  - Announce banner content
  - Kolom: id, title, message, type (info/warning/success), is_active, start_date, end_date, created_at

### ShadCN Components Usage:
- **Card**: `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`, `<CardFooter>`
- **Button**: `<Button>` dengan variants: default, outline, ghost, link
- **Tabs**: `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`
- **Alert**: `<Alert>`, `<AlertTitle>`, `<AlertDescription>` dengan variant: default, destructive
- **Select**: `<Select>`, `<SelectTrigger>`, `<SelectValue>`, `<SelectContent>`, `<SelectItem>`
- **Skeleton**: `<Skeleton>` untuk loading states
- **Dialog**: `<Dialog>`, `<DialogTrigger>`, `<DialogContent>`, `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`, `<DialogFooter>`

### Styling Guidelines:
- Gunakan ShadCN components dengan custom styling
- Warna utama: Blue theme (#2563eb, #1d4ed8, #1e40af, #1e3a8a)
- Typography: Sesuai REBRANDING_GUIDE.md
- Spacing: Kelipatan 4px

### Future Enhancements:
- Booking system (akan didiskusikan nanti)
- Contact form modal (bisa ditambahkan di floating button)
- Social media integration
- SEO optimization

---

## ✅ CHECKLIST SUMMARY

- [ ] Phase 1: Setup & Dependencies
- [ ] Phase 2: Database Schema & API
- [ ] Phase 3: Component Structure
- [ ] Phase 4: Pages
- [ ] Phase 5: Styling & Theming
- [ ] Phase 6: Integration & Routing
- [ ] Phase 7: Responsive Design
- [ ] Phase 8: Polish & Enhancements
- [ ] Phase 9: Testing

---

**Last Updated:** 2025-01-XX
**Status:** 🚧 In Progress

