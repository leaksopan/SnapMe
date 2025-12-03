# 📋 TODO: Sistem Claim Photo SnapMe Studio

## 🎯 Overview
Sistem claim photo dengan 2 flow utama:
1. **Admin Flow**: Setelah transaksi kasir → auto create folder → Admin upload foto setelah sesi selesai
2. **User Flow**: User claim foto via landing page dengan search (Nama/No HP/Email)

---

## 🏗️ PHASE 1: Database Schema

### 1.1 Tabel `photo_folders` (Master Folder Foto)
- [ ] Buat tabel untuk tracking folder foto:
  ```sql
  CREATE TABLE photo_folders (
    id SERIAL PRIMARY KEY,
    folder_path VARCHAR(500) UNIQUE NOT NULL,
    folder_name VARCHAR(255) NOT NULL,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    package_id INTEGER REFERENCES items(id),
    package_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', 
      -- pending (folder dibuat, belum ada foto), 
      -- uploading (sedang upload), 
      -- ready (foto siap diambil), 
      -- claimed (sudah diambil customer)
    photo_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0, -- total size dalam bytes
    uploaded_by INTEGER REFERENCES users(id), -- admin yang upload
    uploaded_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_source CHECK (
      (transaction_id IS NOT NULL AND booking_id IS NULL) OR
      (transaction_id IS NULL AND booking_id IS NOT NULL)
    )
  );
  
  -- Index untuk query performance
  CREATE INDEX idx_photo_folders_customer_phone ON photo_folders(customer_phone);
  CREATE INDEX idx_photo_folders_customer_email ON photo_folders(customer_email);
  CREATE INDEX idx_photo_folders_customer_name ON photo_folders(customer_name);
  CREATE INDEX idx_photo_folders_status ON photo_folders(status);
  CREATE INDEX idx_photo_folders_transaction ON photo_folders(transaction_id);
  CREATE INDEX idx_photo_folders_booking ON photo_folders(booking_id);
  ```

### 1.2 Tabel `photo_files` (Tracking File Foto)
- [ ] Buat tabel untuk tracking setiap file foto:
  ```sql
  CREATE TABLE photo_files (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER NOT NULL REFERENCES photo_folders(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50), -- image/jpeg, image/png, dll
    width INTEGER,
    height INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Index untuk query performance
  CREATE INDEX idx_photo_files_folder ON photo_files(folder_id);
  CREATE INDEX idx_photo_files_active ON photo_files(is_active);
  ```

### 1.3 Update Tabel `transactions`
- [ ] Tambah kolom untuk link ke photo folder (jika belum ada):
  ```sql
  ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS photo_folder_id INTEGER REFERENCES photo_folders(id);
  
  CREATE INDEX IF NOT EXISTS idx_transactions_customer_phone ON transactions(customer_phone);
  CREATE INDEX IF NOT EXISTS idx_transactions_photo_folder ON transactions(photo_folder_id);
  ```

### 1.4 Update Tabel `bookings`
- [ ] Tambah kolom untuk link ke photo folder:
  ```sql
  ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS photo_folder_id INTEGER REFERENCES photo_folders(id);
  
  CREATE INDEX IF NOT EXISTS idx_bookings_photo_folder ON bookings(photo_folder_id);
  ```

### 1.5 Database Functions & Triggers

#### 1.5.1 Function untuk Generate Folder Path
- [ ] Buat function untuk generate folder path:
  ```sql
  CREATE OR REPLACE FUNCTION generate_photo_folder_path(
    p_transaction_id INTEGER DEFAULT NULL,
    p_booking_id INTEGER DEFAULT NULL,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR
  )
  RETURNS TEXT AS $$
  DECLARE
    folder_name TEXT;
    folder_path TEXT;
    date_prefix TEXT;
  BEGIN
    -- Generate date prefix (YYYY-MM-DD)
    date_prefix := TO_CHAR(NOW(), 'YYYY-MM-DD');
    
    -- Generate folder name: YYYY-MM-DD_CustomerName_Phone
    folder_name := date_prefix || '_' || 
                   REPLACE(UPPER(p_customer_name), ' ', '_') || '_' || 
                   REPLACE(p_customer_phone, '-', '');
    
    -- Generate full path
    IF p_transaction_id IS NOT NULL THEN
      folder_path := 'photos/transactions/' || p_transaction_id || '/' || folder_name;
    ELSIF p_booking_id IS NOT NULL THEN
      folder_path := 'photos/bookings/' || p_booking_id || '/' || folder_name;
    ELSE
      folder_path := 'photos/manual/' || folder_name;
    END IF;
    
    RETURN folder_path;
  END;
  $$ LANGUAGE plpgsql;
  ```

#### 1.5.2 Trigger untuk Auto-Create Folder Setelah Transaksi
- [ ] Buat trigger setelah insert transaction:
  ```sql
  CREATE OR REPLACE FUNCTION create_photo_folder_on_transaction()
  RETURNS TRIGGER AS $$
  DECLARE
    v_folder_path TEXT;
    v_folder_id INTEGER;
    v_package_info RECORD;
  BEGIN
    -- Hanya create folder jika customer_phone ada
    IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '' THEN
      -- Get package info dari transaction_items
      SELECT i.id, i.name INTO v_package_info
      FROM transaction_items ti
      JOIN items i ON ti.item_id = i.id
      WHERE ti.transaction_id = NEW.id
        AND i.category = 'studio'
      LIMIT 1;
      
      -- Generate folder path
      v_folder_path := generate_photo_folder_path(
        NEW.id,
        NULL,
        NEW.customer_name,
        NEW.customer_phone
      );
      
      -- Create folder record
      INSERT INTO photo_folders (
        folder_path,
        folder_name,
        transaction_id,
        customer_name,
        customer_phone,
        package_id,
        package_name,
        status
      ) VALUES (
        v_folder_path,
        SPLIT_PART(v_folder_path, '/', -1),
        NEW.id,
        NEW.customer_name,
        NEW.customer_phone,
        COALESCE(v_package_info.id, NULL),
        COALESCE(v_package_info.name, 'Unknown Package'),
        'pending'
      )
      RETURNING id INTO v_folder_id;
      
      -- Update transaction dengan folder_id
      UPDATE transactions
      SET photo_folder_id = v_folder_id
      WHERE id = NEW.id;
      
      -- Create folder di Supabase Storage (akan dilakukan via API)
    END IF;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER trigger_create_photo_folder_transaction
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_photo_folder_on_transaction();
  ```

#### 1.5.3 Trigger untuk Auto-Create Folder Setelah Booking Paid
- [ ] Buat trigger setelah booking status menjadi 'paid':
  ```sql
  CREATE OR REPLACE FUNCTION create_photo_folder_on_booking_paid()
  RETURNS TRIGGER AS $$
  DECLARE
    v_folder_path TEXT;
    v_folder_id INTEGER;
    v_package_info RECORD;
  BEGIN
    -- Hanya create folder jika status berubah ke 'paid' dan belum ada folder
    IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.photo_folder_id IS NULL THEN
      -- Get package info
      SELECT id, name INTO v_package_info
      FROM items
      WHERE id = NEW.package_id;
      
      -- Generate folder path
      v_folder_path := generate_photo_folder_path(
        NULL,
        NEW.id,
        NEW.customer_name,
        NEW.customer_phone
      );
      
      -- Create folder record
      INSERT INTO photo_folders (
        folder_path,
        folder_name,
        booking_id,
        customer_name,
        customer_phone,
        customer_email,
        package_id,
        package_name,
        status
      ) VALUES (
        v_folder_path,
        SPLIT_PART(v_folder_path, '/', -1),
        NEW.id,
        NEW.customer_name,
        NEW.customer_phone,
        NEW.customer_email,
        NEW.package_id,
        COALESCE(v_package_info.name, 'Unknown Package'),
        'pending'
      )
      RETURNING id INTO v_folder_id;
      
      -- Update booking dengan folder_id
      UPDATE bookings
      SET photo_folder_id = v_folder_id
      WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER trigger_create_photo_folder_booking
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_photo_folder_on_booking_paid();
  ```

#### 1.5.4 Function untuk Update Photo Count
- [ ] Buat function untuk update photo count:
  ```sql
  CREATE OR REPLACE FUNCTION update_photo_folder_stats()
  RETURNS TRIGGER AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      UPDATE photo_folders
      SET 
        photo_count = photo_count + 1,
        total_size = total_size + COALESCE(NEW.file_size, 0),
        status = CASE 
          WHEN status = 'pending' THEN 'ready'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = NEW.folder_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE photo_folders
      SET 
        photo_count = GREATEST(photo_count - 1, 0),
        total_size = GREATEST(total_size - COALESCE(OLD.file_size, 0), 0),
        updated_at = NOW()
      WHERE id = OLD.folder_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
  END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER trigger_update_photo_folder_stats
    AFTER INSERT OR DELETE ON photo_files
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_folder_stats();
  ```

---

## 📦 PHASE 2: Supabase Storage Setup

### 2.1 Create Storage Bucket
- [ ] Buat bucket `photos` di Supabase Storage:
  - [ ] Go to Storage → Create Bucket
  - [ ] Name: `photos`
  - [ ] Public: `false` (private bucket)
  - [ ] File size limit: sesuai kebutuhan (default 50MB per file)

### 2.2 Storage Policies
- [ ] Buat RLS policies untuk storage:
  ```sql
  -- Policy untuk admin upload
  CREATE POLICY "Admin can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] IN ('transactions', 'bookings', 'manual')
  );
  
  -- Policy untuk admin read
  CREATE POLICY "Admin can read photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos');
  
  -- Policy untuk public read (untuk customer claim)
  CREATE POLICY "Public can read photos via signed URL"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'photos');
  ```

### 2.3 Folder Structure
- [ ] Struktur folder di Storage:
  ```
  photos/
  ├── transactions/
  │   └── {transaction_id}/
  │       └── {YYYY-MM-DD_CustomerName_Phone}/
  │           ├── info.json (metadata package)
  │           └── photo1.jpg
  │           └── photo2.jpg
  ├── bookings/
  │   └── {booking_id}/
  │       └── {YYYY-MM-DD_CustomerName_Phone}/
  │           ├── info.json
  │           └── photo1.jpg
  └── manual/
      └── {YYYY-MM-DD_CustomerName_Phone}/
          └── ...
  ```

---

## 🔧 PHASE 3: API Functions

### 3.1 Photo Folder API Functions
- [ ] Buat `src/utils/api/photoFolders.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  // Create photo folder (dipanggil setelah transaksi/booking)
  export const createPhotoFolder = async (folderData) => {
    const { data, error } = await supabase
      .from('photo_folders')
      .insert(folderData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Create folder di Storage
    await createStorageFolder(data.folder_path);
    
    // Create info.json dengan metadata
    await createFolderInfoFile(data);
    
    return data;
  };
  
  // Create folder di Supabase Storage
  const createStorageFolder = async (folderPath) => {
    // Supabase Storage tidak support empty folder
    // Jadi kita create dummy file atau info.json langsung
    const infoContent = JSON.stringify({ created_at: new Date().toISOString() });
    const blob = new Blob([infoContent], { type: 'application/json' });
    
    const { error } = await supabase.storage
      .from('photos')
      .upload(`${folderPath}/.folder_info`, blob, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error && error.message !== 'The resource already exists') {
      throw error;
    }
  };
  
  // Create info.json dengan metadata package
  const createFolderInfoFile = async (folderData) => {
    const infoData = {
      folder_id: folderData.id,
      customer_name: folderData.customer_name,
      customer_phone: folderData.customer_phone,
      customer_email: folderData.customer_email,
      package_id: folderData.package_id,
      package_name: folderData.package_name,
      created_at: new Date().toISOString(),
      transaction_id: folderData.transaction_id,
      booking_id: folderData.booking_id
    };
    
    const infoContent = JSON.stringify(infoData, null, 2);
    const blob = new Blob([infoContent], { type: 'application/json' });
    
    const { error } = await supabase.storage
      .from('photos')
      .upload(`${folderData.folder_path}/info.json`, blob, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
  };
  
  // Get folder by ID
  export const getPhotoFolderById = async (id) => {
    const { data, error } = await supabase
      .from('photo_folders')
      .select(`
        *,
        items(id, name, image_url),
        transactions(id, transaction_number, created_at),
        bookings(id, booking_number, booking_date)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  };
  
  // Search folder by customer info (untuk claim photo)
  export const searchPhotoFolder = async (searchTerm, searchType = 'all') => {
    let query = supabase
      .from('photo_folders')
      .select(`
        *,
        items(id, name, image_url)
      `)
      .in('status', ['ready', 'claimed']);
    
    // Normalize search term
    const normalizedSearch = searchTerm.trim().toLowerCase();
    
    if (searchType === 'phone' || searchType === 'all') {
      query = query.or(`customer_phone.ilike.%${normalizedSearch}%`);
    }
    if (searchType === 'name' || searchType === 'all') {
      query = query.or(`customer_name.ilike.%${normalizedSearch}%`);
    }
    if (searchType === 'email' || searchType === 'all') {
      query = query.or(`customer_email.ilike.%${normalizedSearch}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  };
  
  // Get folders untuk admin (dengan filter)
  export const getPhotoFolders = async (filters = {}) => {
    let query = supabase
      .from('photo_folders')
      .select(`
        *,
        items(id, name),
        transactions(id, transaction_number),
        bookings(id, booking_number),
        users:uploaded_by(id, full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.customer_phone) {
      query = query.ilike('customer_phone', `%${filters.customer_phone}%`);
    }
    if (filters.customer_name) {
      query = query.ilike('customer_name', `%${filters.customer_name}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  };
  
  // Update folder status
  export const updatePhotoFolderStatus = async (id, status) => {
    const updateData = { status, updated_at: new Date().toISOString() };
    
    if (status === 'claimed') {
      updateData.claimed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('photo_folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };
  ```

### 3.2 Photo Files API Functions
- [ ] Buat `src/utils/api/photoFiles.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  // Upload photo ke folder
  export const uploadPhoto = async (folderId, file, onProgress = null) => {
    // Get folder info
    const { data: folder, error: folderError } = await supabase
      .from('photo_folders')
      .select('folder_path')
      .eq('id', folderId)
      .single();
    
    if (folderError) throw folderError;
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder.folder_path}/${fileName}`;
    
    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: onProgress
      });
    
    if (uploadError) throw uploadError;
    
    // Get file metadata
    const fileSize = file.size;
    const fileType = file.type;
    
    // Get image dimensions (jika image)
    let width = null;
    let height = null;
    if (fileType.startsWith('image/')) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = () => {
          width = img.width;
          height = img.height;
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        img.onerror = reject;
        img.src = objectUrl;
      });
    }
    
    // Get current user (admin)
    const { data: { user } } = await supabase.auth.getUser();
    const uploadedBy = user?.id || null;
    
    // Save file record
    const { data: fileRecord, error: recordError } = await supabase
      .from('photo_files')
      .insert({
        folder_id: folderId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
        width,
        height,
        uploaded_by: uploadedBy
      })
      .select()
      .single();
    
    if (recordError) throw recordError;
    
    return fileRecord;
  };
  
  // Upload multiple photos
  export const uploadMultiplePhotos = async (folderId, files, onProgress = null) => {
    const results = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progressCallback = onProgress ? (progress) => {
        const overallProgress = ((i / totalFiles) * 100) + (progress.loaded / progress.total) * (100 / totalFiles);
        onProgress({ file: file.name, progress: overallProgress, current: i + 1, total: totalFiles });
      } : null;
      
      try {
        const result = await uploadPhoto(folderId, file, progressCallback);
        results.push({ success: true, file: file.name, data: result });
      } catch (error) {
        results.push({ success: false, file: file.name, error: error.message });
      }
    }
    
    return results;
  };
  
  // Get photos untuk folder
  export const getPhotosByFolder = async (folderId) => {
    const { data, error } = await supabase
      .from('photo_files')
      .select('*')
      .eq('folder_id', folderId)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  };
  
  // Get signed URL untuk download (public access)
  export const getPhotoDownloadUrl = async (filePath, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
      .from('photos')
      .createSignedUrl(filePath, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  };
  
  // Get multiple signed URLs
  export const getPhotoDownloadUrls = async (filePaths, expiresIn = 3600) => {
    const urls = {};
    
    for (const filePath of filePaths) {
      try {
        const url = await getPhotoDownloadUrl(filePath, expiresIn);
        urls[filePath] = url;
      } catch (error) {
        urls[filePath] = null;
      }
    }
    
    return urls;
  };
  
  // Delete photo
  export const deletePhoto = async (fileId) => {
    // Get file info
    const { data: file, error: fileError } = await supabase
      .from('photo_files')
      .select('file_path')
      .eq('id', fileId)
      .single();
    
    if (fileError) throw fileError;
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('photos')
      .remove([file.file_path]);
    
    if (storageError) throw storageError;
    
    // Delete record
    const { error: deleteError } = await supabase
      .from('photo_files')
      .delete()
      .eq('id', fileId);
    
    if (deleteError) throw deleteError;
  };
  
  // Increment download count
  export const incrementDownloadCount = async (fileId) => {
    const { error } = await supabase
      .from('photo_files')
      .update({
        download_count: supabase.raw('download_count + 1'),
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', fileId);
    
    if (error) throw error;
  };
  ```

---

## 🎨 PHASE 4: Admin Components (Claim Photo Menu)

### 4.1 Photo Folder List Component
- [ ] Buat `src/components/claimPhoto/FolderList.js`:
  - [ ] Display list folder dengan status filter
  - [ ] Search by customer name/phone
  - [ ] Status badges: pending, ready, claimed
  - [ ] Click folder → buka detail & upload

### 4.2 Photo Upload Component
- [ ] Buat `src/components/claimPhoto/PhotoUpload.js`:
  - [ ] Drag & drop atau file picker
  - [ ] Multiple file upload
  - [ ] Progress bar per file
  - [ ] Preview sebelum upload
  - [ ] Upload ke folder yang dipilih

### 4.3 Folder Detail Component
- [ ] Buat `src/components/claimPhoto/FolderDetail.js`:
  - [ ] Display folder info (customer, package, date)
  - [ ] List semua foto di folder
  - [ ] Thumbnail grid dengan preview
  - [ ] Delete photo option
  - [ ] Mark as ready button

---

## 📄 PHASE 5: User Components (Landing Page)

### 5.1 Claim Photo Search Component
- [ ] Buat `src/components/claimPhoto/ClaimSearch.js`:
  - [ ] Search input dengan tabs: Nama / No HP / Email
  - [ ] Search button
  - [ ] Display search results
  - [ ] Select folder untuk claim

### 5.2 Photo Gallery Component
- [ ] Buat `src/components/claimPhoto/PhotoGallery.js`:
  - [ ] Grid layout untuk foto
  - [ ] Lightbox untuk preview
  - [ ] Download individual photo
  - [ ] Download all photos (zip)
  - [ ] Share via WhatsApp/Link

### 5.3 Claim Verification Component
- [ ] Buat `src/components/claimPhoto/ClaimVerification.js`:
  - [ ] Verify customer info sebelum show foto
  - [ ] OTP atau simple verification (optional)
  - [ ] Display folder info setelah verified

---

## 📱 PHASE 6: Pages

### 6.1 Admin Claim Photo Page
- [ ] Buat `src/pages/ClaimPhoto.js` (Admin):
  - [ ] Folder list dengan filter
  - [ ] Folder detail & upload
  - [ ] Status management

### 6.2 User Claim Photo Page (Landing)
- [ ] Buat `src/pages/LandingClaimPhoto.js`:
  - [ ] Search interface
  - [ ] Photo gallery setelah verified
  - [ ] Download & share options

---

## 🔄 PHASE 7: Integration dengan Transaksi & Booking

### 7.1 Update Kasir Component
- [ ] Update `src/pages/Kasir.js`:
  - [ ] Pastikan customer_phone diisi saat transaksi
  - [ ] Trigger auto-create folder setelah payment
  - [ ] Display folder info di receipt (optional)

### 7.2 Update Booking Flow
- [ ] Update booking success handler:
  - [ ] Auto-create folder setelah payment confirmed
  - [ ] Link folder dengan booking_id
  - [ ] Include email dari booking

---

## ⚡ PHASE 8: Features & Enhancements

### 8.1 Download Features
- [ ] Single photo download
- [ ] Multiple photos download (zip)
- [ ] Download all photos dari folder
- [ ] Share via WhatsApp dengan link
- [ ] Generate shareable link (expires in X days)

### 8.2 Notification System
- [ ] Email notification saat foto siap (untuk booking online)
- [ ] SMS notification (optional)
- [ ] WhatsApp notification (optional)

### 8.3 Security & Privacy
- [ ] Signed URLs untuk download (expires)
- [ ] Rate limiting untuk download
- [ ] Verification sebelum show foto
- [ ] Log download activity

### 8.4 Admin Features
- [ ] Bulk upload photos
- [ ] Photo compression/optimization
- [ ] Photo editing (crop, rotate)
- [ ] Folder management (rename, delete)
- [ ] Statistics & analytics

---

## 🧪 PHASE 9: Testing

### 9.1 Flow Testing
- [ ] Test transaksi kasir → auto create folder
- [ ] Test booking online → auto create folder
- [ ] Test admin upload foto
- [ ] Test user search & claim
- [ ] Test download & share

### 9.2 Edge Cases
- [ ] Test jika customer_phone kosong
- [ ] Test jika folder sudah ada
- [ ] Test upload file besar
- [ ] Test multiple concurrent uploads
- [ ] Test search dengan berbagai format

---

## 📝 NOTES

### Folder Naming Convention:
- Format: `YYYY-MM-DD_CustomerName_Phone`
- Contoh: `2025-01-15_JOHN_DOE_081234567890`
- Sanitize special characters

### Status Flow:
1. `pending` → Folder dibuat, belum ada foto
2. `uploading` → Sedang upload foto
3. `ready` → Foto siap diambil customer
4. `claimed` → Customer sudah mengambil foto

### Search Types:
- **Nama**: Search by customer_name (case insensitive)
- **No HP**: Search by customer_phone (format flexible)
- **Email**: Search by customer_email (untuk booking online)

### Storage Structure:
```
photos/
├── transactions/{id}/{folder_name}/
│   ├── info.json
│   └── photos...
├── bookings/{id}/{folder_name}/
│   ├── info.json
│   └── photos...
└── manual/{folder_name}/
    └── photos...
```

### Security Considerations:
- Private bucket dengan signed URLs
- Verification sebelum show foto
- Rate limiting untuk download
- Expiring signed URLs (1 hour default)

---

## ✅ CHECKLIST SUMMARY

- [ ] Phase 1: Database Schema
- [ ] Phase 2: Supabase Storage Setup
- [ ] Phase 3: API Functions
- [ ] Phase 4: Admin Components
- [ ] Phase 5: User Components
- [ ] Phase 6: Pages
- [ ] Phase 7: Integration
- [ ] Phase 8: Features & Enhancements
- [ ] Phase 9: Testing

---

**Last Updated:** 2025-01-XX
**Status:** 🚧 In Progress

