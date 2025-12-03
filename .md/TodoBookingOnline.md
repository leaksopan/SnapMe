# 📋 TODO: Sistem Booking Online SnapMe Studio

## 🎯 Overview
Sistem booking online dengan flow: **Pilih Paket → Detail → Tanggal & Jam → Background → Syarat & Ketentuan → Payment (Midtrans)**. Menggunakan **Supabase Realtime** untuk pengecekan slot availability dan **auto-release** slot jika tidak bayar dalam 15 menit.

---

## 🏗️ PHASE 1: Database Schema

### 1.1 Tabel `backgrounds` (Master Background)
- [ ] Buat tabel untuk master background:
  ```sql
  CREATE TABLE backgrounds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    is_free BOOLEAN DEFAULT true,
    price INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

### 1.2 Tabel `package_backgrounds` (Relasi Paket-Background)
- [ ] Buat tabel untuk link background dengan produk:
  ```sql
  CREATE TABLE package_backgrounds (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    background_id INTEGER NOT NULL REFERENCES backgrounds(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(package_id, background_id)
  );
  ```

### 1.3 Tabel `bookings` (Booking Orders)
- [ ] Buat tabel untuk booking:
  ```sql
  CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    package_id INTEGER NOT NULL REFERENCES items(id),
    background_id INTEGER REFERENCES backgrounds(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_amount INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_payment', 
      -- pending_payment, paid, cancelled, expired, completed
    payment_status VARCHAR(50) DEFAULT 'pending',
      -- pending, paid, failed, expired
    midtrans_order_id VARCHAR(255),
    midtrans_token VARCHAR(500),
    payment_expires_at TIMESTAMP,
    payment_url TEXT,
    additional_notes TEXT,
    terms_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_time_slot CHECK (end_time > start_time)
  );
  
  -- Index untuk query performance
  CREATE INDEX idx_bookings_date_time ON bookings(booking_date, start_time, end_time);
  CREATE INDEX idx_bookings_status ON bookings(status);
  CREATE INDEX idx_bookings_payment_expires ON bookings(payment_expires_at);
  CREATE INDEX idx_bookings_customer ON bookings(customer_phone);
  ```

### 1.4 Tabel `booking_terms` (Master Syarat & Ketentuan)
- [ ] Buat tabel untuk syarat & ketentuan:
  ```sql
  CREATE TABLE booking_terms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

### 1.5 Enable Realtime untuk Tabel `bookings`
- [ ] Enable Realtime di Supabase Dashboard:
  - [ ] Go to Database → Replication
  - [ ] Enable replication untuk tabel `bookings`
  - [ ] Pastikan INSERT, UPDATE, DELETE events enabled

### 1.6 Database Functions & Triggers

#### 1.6.1 Function untuk Generate Booking Number
- [ ] Buat function:
  ```sql
  CREATE OR REPLACE FUNCTION generate_booking_number()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.booking_number := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 6, '0');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER set_booking_number
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_number();
  ```

#### 1.6.2 Function untuk Auto-Expire Payment (15 menit)
- [ ] Buat function untuk update expired bookings:
  ```sql
  CREATE OR REPLACE FUNCTION expire_pending_bookings()
  RETURNS void AS $$
  BEGIN
    UPDATE bookings
    SET 
      status = 'expired',
      payment_status = 'expired',
      updated_at = NOW()
    WHERE 
      status = 'pending_payment'
      AND payment_status = 'pending'
      AND payment_expires_at < NOW();
  END;
  $$ LANGUAGE plpgsql;
  ```

#### 1.6.3 Trigger untuk Auto-Update `updated_at`
- [ ] Buat trigger:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  ```

#### 1.6.4 Function untuk Check Slot Availability
- [ ] Buat function untuk check apakah slot tersedia:
  ```sql
  CREATE OR REPLACE FUNCTION check_slot_availability(
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id INTEGER DEFAULT NULL
  )
  RETURNS BOOLEAN AS $$
  DECLARE
    conflict_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE 
      booking_date = p_booking_date
      AND status IN ('pending_payment', 'paid')
      AND (
        (start_time < p_end_time AND end_time > p_start_time)
        OR (start_time = p_start_time)
      )
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
    
    RETURN conflict_count = 0;
  END;
  $$ LANGUAGE plpgsql;
  ```

---

## 📦 PHASE 2: Dependencies & Setup

### 2.1 Install Midtrans SDK
- [ ] Install Midtrans SDK untuk React:
  ```bash
  npm install midtrans-client
  ```

### 2.2 Install Additional Dependencies
- [ ] Install `react-datepicker` atau `@radix-ui/react-calendar` untuk date picker:
  ```bash
  npm install react-datepicker
  # atau
  npx shadcn@latest add @shadcn/calendar
  ```
- [ ] Install `date-fns` untuk date manipulation:
  ```bash
  npm install date-fns
  ```

### 2.3 ShadCN Components untuk Booking
- [ ] Install komponen tambahan:
  ```bash
  npx shadcn@latest add @shadcn/calendar @shadcn/checkbox @shadcn/radio-group @shadcn/scroll-area
  ```

### 2.4 Environment Variables
- [ ] Buat `.env` untuk Midtrans config:
  ```env
  REACT_APP_MIDTRANS_SERVER_KEY=your_server_key
  REACT_APP_MIDTRANS_CLIENT_KEY=your_client_key
  REACT_APP_MIDTRANS_IS_PRODUCTION=false
  ```

---

## 🔧 PHASE 3: API Functions

### 3.1 Booking API Functions
- [ ] Buat `src/utils/api/bookings.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  // Generate time slots berdasarkan durasi paket
  export const generateTimeSlots = (packageDuration = 60) => {
    const slots = [];
    const startHour = 9; // 09:00
    const endHour = 20; // 20:00 (8 malam)
    const bufferMinutes = 10; // Buffer 10 menit antar slot
    
    let currentTime = startHour * 60; // Convert to minutes
    
    while (currentTime + packageDuration <= endHour * 60) {
      const startMinutes = currentTime;
      const endMinutes = currentTime + packageDuration;
      
      const startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      
      slots.push({
        start: startTime,
        end: endTime,
        display: `${startTime} - ${endTime}`
      });
      
      // Next slot dengan buffer
      currentTime = endMinutes + bufferMinutes;
    }
    
    return slots;
  };
  
  // Check slot availability
  export const checkSlotAvailability = async (date, startTime, endTime, excludeBookingId = null) => {
    const { data, error } = await supabase.rpc('check_slot_availability', {
      p_booking_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_exclude_booking_id: excludeBookingId
    });
    
    if (error) throw error;
    return data;
  };
  
  // Get available slots untuk tanggal tertentu
  export const getAvailableSlots = async (date, packageDuration) => {
    const allSlots = generateTimeSlots(packageDuration);
    const availableSlots = [];
    
    for (const slot of allSlots) {
      const isAvailable = await checkSlotAvailability(date, slot.start, slot.end);
      if (isAvailable) {
        availableSlots.push(slot);
      }
    }
    
    return availableSlots;
  };
  
  // Create booking
  export const createBooking = async (bookingData) => {
    const paymentExpiresAt = new Date();
    paymentExpiresAt.setMinutes(paymentExpiresAt.getMinutes() + 15); // 15 menit
    
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        payment_expires_at: paymentExpiresAt.toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };
  
  // Get booking by ID
  export const getBookingById = async (id) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        items(id, name, price, image_url, duration),
        backgrounds(id, name, image_url)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  };
  
  // Update booking status
  export const updateBookingStatus = async (id, status, paymentStatus = null) => {
    const updateData = { status };
    if (paymentStatus) updateData.payment_status = paymentStatus;
    
    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };
  
  // Get bookings by date (untuk calendar view)
  export const getBookingsByDate = async (date) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .in('status', ['pending_payment', 'paid'])
      .order('start_time');
    
    if (error) throw error;
    return data || [];
  };
  ```

### 3.2 Background API Functions
- [ ] Buat `src/utils/api/backgrounds.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  // Get backgrounds untuk package tertentu
  export const getBackgroundsByPackage = async (packageId) => {
    const { data, error } = await supabase
      .from('package_backgrounds')
      .select(`
        *,
        backgrounds(*)
      `)
      .eq('package_id', packageId)
      .eq('backgrounds.is_active', true)
      .order('display_order, is_default DESC');
    
    if (error) throw error;
    return data || [];
  };
  
  // Get all active backgrounds
  export const getAllBackgrounds = async () => {
    const { data, error } = await supabase
      .from('backgrounds')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  };
  ```

### 3.3 Terms API Functions
- [ ] Buat `src/utils/api/terms.js`:
  ```js
  import { supabase } from '../../supabaseClient';
  
  // Get active terms & conditions
  export const getActiveTerms = async () => {
    const { data, error } = await supabase
      .from('booking_terms')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (error) throw error;
    return data || [];
  };
  ```

### 3.4 Midtrans API Functions
- [ ] Buat `src/utils/api/midtrans.js`:
  ```js
  import midtransClient from 'midtrans-client';
  
  // Initialize Midtrans Snap
  const snap = new midtransClient.Snap({
    isProduction: process.env.REACT_APP_MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.REACT_APP_MIDTRANS_SERVER_KEY,
    clientKey: process.env.REACT_APP_MIDTRANS_CLIENT_KEY
  });
  
  // Create transaction token
  export const createMidtransToken = async (bookingData) => {
    const parameter = {
      transaction_details: {
        order_id: bookingData.booking_number,
        gross_amount: bookingData.total_amount
      },
      customer_details: {
        first_name: bookingData.customer_name,
        email: bookingData.customer_email || '',
        phone: bookingData.customer_phone
      },
      item_details: [
        {
          id: bookingData.package_id.toString(),
          price: bookingData.total_amount,
          quantity: 1,
          name: bookingData.package_name || 'Booking Studio'
        }
      ],
      expiry: {
        unit: 'minute',
        duration: 15
      }
    };
    
    try {
      const token = await snap.createTransactionToken(parameter);
      return token;
    } catch (error) {
      console.error('Midtrans error:', error);
      throw error;
    }
  };
  
  // Update booking dengan Midtrans data
  export const updateBookingWithMidtrans = async (bookingId, token, orderId) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        midtrans_token: token,
        midtrans_order_id: orderId,
        payment_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${token}`
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };
  ```

---

## 🎨 PHASE 4: Components

### 4.1 Booking Flow Components

#### 4.1.1 Package Detail Component
- [ ] Buat `src/components/booking/PackageDetail.js`:
  - [ ] Display package image, name, price, duration
  - [ ] Display terms & conditions dari package
  - [ ] Button "Lanjutkan Booking"

#### 4.1.2 Date & Time Selector Component
- [ ] Buat `src/components/booking/DateTimeSelector.js`:
  - [ ] Calendar picker (ShadCN Calendar)
  - [ ] Generate time slots dengan format: 09:00-10:00, 10:10-11:10, dst
  - [ ] Real-time check availability menggunakan Supabase Realtime
  - [ ] Display available slots (disable yang sudah booked)
  - [ ] Handle timezone (WIB)

#### 4.1.3 Background Selector Component
- [ ] Buat `src/components/booking/BackgroundSelector.js`:
  - [ ] Fetch backgrounds untuk package yang dipilih
  - [ ] Grid display dengan thumbnail
  - [ ] Label "Background Gratis" atau harga
  - [ ] Radio selection

#### 4.1.4 Terms & Conditions Modal
- [ ] Buat `src/components/booking/TermsModal.js`:
  - [ ] Fetch terms dari database
  - [ ] Scrollable content
  - [ ] Checkbox "Saya setuju dengan syarat dan ketentuan"
  - [ ] Button "Lanjutkan" (disabled jika belum centang)
  - [ ] Button "Batal"

#### 4.1.5 Booking Summary Component
- [ ] Buat `src/components/booking/BookingSummary.js`:
  - [ ] Display: Package, Date, Time, Background, Total
  - [ ] Double check sebelum submit
  - [ ] Button "Konfirmasi Booking"

#### 4.1.6 Payment Component
- [ ] Buat `src/components/booking/Payment.js`:
  - [ ] Integrasi Midtrans Snap
  - [ ] Display payment URL atau embed
  - [ ] Countdown timer 15 menit
  - [ ] Handle payment callback

### 4.2 Realtime Subscription Hook
- [ ] Buat `src/hooks/useBookingRealtime.js`:
  ```js
  import { useEffect, useState } from 'react';
  import { supabase } from '../supabaseClient';
  
  export const useBookingRealtime = (date, onSlotChange) => {
    const [isConnected, setIsConnected] = useState(false);
    
    useEffect(() => {
      const channel = supabase
        .channel(`bookings-${date}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'bookings',
            filter: `booking_date=eq.${date}`
          },
          (payload) => {
            console.log('Booking change detected:', payload);
            onSlotChange(payload);
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });
      
      return () => {
        supabase.removeChannel(channel);
      };
    }, [date, onSlotChange]);
    
    return { isConnected };
  };
  ```

---

## 📄 PHASE 5: Pages

### 5.1 Booking Page
- [ ] Buat `src/pages/Booking.js`:
  - [ ] Multi-step form:
    1. Package Detail
    2. Date & Time Selection
    3. Background Selection
    4. Terms & Conditions
    5. Booking Summary & Confirmation
    6. Payment
  - [ ] State management untuk booking data
  - [ ] Navigation antara steps
  - [ ] Progress indicator

### 5.2 Booking Success Page
- [ ] Buat `src/pages/BookingSuccess.js`:
  - [ ] Display booking number
  - [ ] Display booking details
  - [ ] Link untuk download invoice (optional)
  - [ ] Link kembali ke home

### 5.3 Booking Failed/Expired Page
- [ ] Buat `src/pages/BookingFailed.js`:
  - [ ] Display error message
  - [ ] Option untuk booking ulang
  - [ ] Link kembali ke home

---

## ⚡ PHASE 6: Realtime Implementation

### 6.1 Realtime Slot Availability Check
- [ ] Implement realtime subscription di DateTimeSelector:
  - [ ] Subscribe ke perubahan bookings untuk tanggal yang dipilih
  - [ ] Update available slots secara real-time
  - [ ] Handle race condition (multiple users booking same slot)

### 6.2 Double Check Before Booking
- [ ] Implement final availability check sebelum create booking:
  ```js
  const handleConfirmBooking = async () => {
    // Final check sebelum booking
    const isAvailable = await checkSlotAvailability(
      selectedDate,
      selectedStartTime,
      selectedEndTime
    );
    
    if (!isAvailable) {
      alert('Maaf, slot ini sudah tidak tersedia. Silakan pilih slot lain.');
      return;
    }
    
    // Proceed dengan booking
    await createBooking(bookingData);
  };
  ```

### 6.3 Auto-Expire Payment Handler
- [ ] Implement cron job atau scheduled function:
  - [ ] Check expired bookings setiap 1 menit
  - [ ] Update status menjadi 'expired'
  - [ ] Release slot untuk booking lain
  - [ ] Bisa menggunakan Supabase Edge Functions atau external cron

---

## 💳 PHASE 7: Midtrans Integration

### 7.1 Payment Flow
- [ ] Create booking dengan status 'pending_payment'
- [ ] Generate Midtrans token
- [ ] Update booking dengan token & payment URL
- [ ] Redirect ke Midtrans payment page
- [ ] Handle payment callback/webhook

### 7.2 Payment Webhook Handler
- [ ] Buat endpoint untuk handle Midtrans webhook:
  - [ ] Verify payment status
  - [ ] Update booking status ke 'paid' jika berhasil
  - [ ] Update booking status ke 'failed' jika gagal
  - [ ] Release slot jika payment expired/failed

### 7.3 Payment Status Check
- [ ] Implement polling atau webhook untuk check payment status
- [ ] Update UI secara real-time saat payment berhasil

---

## 🔄 PHASE 8: Flow & Edge Cases

### 8.1 Booking Flow Validation
- [ ] Validasi setiap step:
  - [ ] Package selected
  - [ ] Date & time selected
  - [ ] Background selected
  - [ ] Terms accepted
  - [ ] Customer data filled

### 8.2 Race Condition Handling
- [ ] Implement optimistic locking:
  - [ ] Check availability sebelum booking
  - [ ] Double check saat create booking
  - [ ] Handle conflict jika slot sudah diambil

### 8.3 Timeout Handling
- [ ] Implement countdown timer untuk payment (15 menit)
- [ ] Auto-release slot jika timeout
- [ ] Notify user jika payment expired

### 8.4 Error Handling
- [ ] Handle network errors
- [ ] Handle Supabase errors
- [ ] Handle Midtrans errors
- [ ] Display user-friendly error messages

### 8.5 Edge Cases
- [ ] Handle jika user close browser sebelum payment
- [ ] Handle jika user refresh page di tengah booking
- [ ] Handle jika slot diambil oleh user lain
- [ ] Handle jika payment webhook delay
- [ ] Handle jika Midtrans service down

---

## 🧪 PHASE 9: Testing

### 9.1 Unit Testing
- [ ] Test time slot generation
- [ ] Test availability check function
- [ ] Test booking creation
- [ ] Test status updates

### 9.2 Integration Testing
- [ ] Test full booking flow
- [ ] Test realtime updates
- [ ] Test Midtrans integration
- [ ] Test payment webhook

### 9.3 E2E Testing
- [ ] Test complete user journey
- [ ] Test concurrent bookings
- [ ] Test payment timeout
- [ ] Test error scenarios

---

## 📝 NOTES

### Time Slot Format:
- Format: `09:00 - 10:00`, `10:10 - 11:10`, `11:20 - 12:30`
- Durasi paket menentukan panjang slot (default 60 menit)
- Buffer 10 menit antar slot
- Auto-generate dari 09:00 sampai 20:00

### Booking Status Flow:
1. `pending_payment` → Slot reserved, menunggu payment (15 menit)
2. `paid` → Payment berhasil, booking confirmed
3. `expired` → Payment timeout, slot released
4. `cancelled` → User cancel atau admin cancel
5. `completed` → Booking selesai (setelah sesi foto)

### Realtime Events:
- Subscribe ke INSERT, UPDATE, DELETE di tabel `bookings`
- Filter berdasarkan `booking_date`
- Update available slots secara real-time
- Handle race conditions dengan double check

### Payment Flow:
1. Create booking → Status: `pending_payment`
2. Generate Midtrans token
3. Redirect ke payment page
4. User bayar → Webhook update status ke `paid`
5. Timeout 15 menit → Auto-update ke `expired`

### Database Constraints:
- Unique constraint: `booking_date + start_time + end_time` (untuk prevent double booking)
- Check constraint: `end_time > start_time`
- Foreign keys: `package_id`, `background_id`

---

## ✅ CHECKLIST SUMMARY

- [ ] Phase 1: Database Schema
- [ ] Phase 2: Dependencies & Setup
- [ ] Phase 3: API Functions
- [ ] Phase 4: Components
- [ ] Phase 5: Pages
- [ ] Phase 6: Realtime Implementation
- [ ] Phase 7: Midtrans Integration
- [ ] Phase 8: Flow & Edge Cases
- [ ] Phase 9: Testing

---

**Last Updated:** 2025-01-XX
**Status:** 🚧 In Progress

