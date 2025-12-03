-- =========================================================
-- SNAPME SCHEMA BACKUP (NO DATA)
-- Target: Supabase / PostgreSQL 15
-- Langkah pakai:
-- 1. Buat project Supabase baru
-- 2. Buka SQL Editor
-- 3. Paste isi file ini / upload, RUN sekali
-- =========================================================

-- ---------------------------------------------------------
-- EXTENSIONS (buat fungsi yang dipakai schema ini)
-- ---------------------------------------------------------
-- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- cron job (optional, tapi disarankan kalau mau auto-cleanup jalan)
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;

-- ---------------------------------------------------------
-- TABLES (schema public)
-- Urutan sudah diatur supaya dependency FK aman
-- ---------------------------------------------------------

-- 1) items
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL,
  category text NOT NULL
    CHECK (category = ANY (ARRAY['studio'::text, 'addon'::text, 'minuman'::text, 'snack'::text, 'fotogroup'::text])),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  stock integer DEFAULT 0,
  image_url text,
  duration text
);

COMMENT ON COLUMN public.items.stock IS 'Jumlah stok item yang tersedia';
COMMENT ON COLUMN public.items.image_url IS 'URL foto/gambar untuk layanan atau produk';
COMMENT ON COLUMN public.items.duration IS 'Durasi layanan untuk kategori studio (contoh: 30Menit/Sesi)';

-- 2) users
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'kasir'::text
    CHECK (role = ANY (ARRAY['admin'::text, 'kasir'::text])),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text NOT NULL UNIQUE,
  customer_name text NOT NULL
    CHECK (TRIM(BOTH FROM customer_name) <> ''::text AND customer_name IS NOT NULL),
  payment_method text NOT NULL
    CHECK (payment_method = ANY (ARRAY['Cash'::text, 'Transfer'::text])),
  total_amount integer NOT NULL
    CHECK (total_amount > 0),
  user_id uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  payment_amount integer DEFAULT 0,
  change_amount integer DEFAULT 0
);

COMMENT ON COLUMN public.transactions.payment_amount IS 'Jumlah uang yang dibayarkan customer';
COMMENT ON COLUMN public.transactions.change_amount IS 'Jumlah kembalian yang diberikan ke customer';

-- 4) transaction_items
CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id),
  item_id uuid REFERENCES public.items(id),
  quantity integer NOT NULL
    CHECK (quantity > 0),
  unit_price integer NOT NULL
    CHECK (unit_price > 0),
  subtotal integer NOT NULL
    CHECK (subtotal > 0),
  created_at timestamptz DEFAULT now()
);

-- 5) user_permissions
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  module_name text NOT NULL
    CHECK (module_name = ANY (ARRAY['dashboard'::text, 'history'::text, 'stok'::text])),
  has_access boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------
-- FUNCTIONS (schema public)
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_transactions()
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Hapus transaksi yang lebih dari 5 menit dan tidak punya items
  DELETE FROM transactions 
  WHERE id IN (
    SELECT t.id 
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    WHERE ti.transaction_id IS NULL
    AND t.created_at < NOW() - INTERVAL '5 minutes'
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_user_permissions()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insert default permissions untuk user baru
    INSERT INTO user_permissions (user_id, module_name, has_access)
    VALUES 
        (NEW.id, 'dashboard', NEW.role = 'admin'),
        (NEW.id, 'history', NEW.role = 'admin'),
        (NEW.id, 'stok', NEW.role = 'admin');
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction_atomic(
  p_transaction_number text,
  p_customer_name text,
  p_payment_method text,
  p_total_amount numeric,
  p_user_id uuid,
  p_items jsonb,
  p_payment_amount numeric DEFAULT NULL::numeric,
  p_change_amount numeric DEFAULT NULL::numeric
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_transaction_id UUID;
  v_transaction_record JSON;
  v_item JSONB;
  v_calculated_total DECIMAL := 0;
  v_item_count INTEGER := 0;
BEGIN
  -- 📝 VALIDASI INPUT
  IF p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name tidak boleh kosong';
  END IF;
  
  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount harus lebih besar dari 0';
  END IF;
  
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Items tidak boleh kosong';
  END IF;

  -- 🔍 VALIDASI ITEMS DAN HITUNG TOTAL
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Validasi setiap item
    IF (v_item->>'item_id') IS NULL THEN
      RAISE EXCEPTION 'Item ID tidak boleh kosong';
    END IF;
    
    IF (v_item->>'quantity')::INTEGER <= 0 THEN
      RAISE EXCEPTION 'Quantity harus lebih besar dari 0';
    END IF;
    
    IF (v_item->>'unit_price')::DECIMAL <= 0 THEN
      RAISE EXCEPTION 'Unit price harus lebih besar dari 0';
    END IF;
    
    IF (v_item->>'subtotal')::DECIMAL <= 0 THEN
      RAISE EXCEPTION 'Subtotal harus lebih besar dari 0';
    END IF;
    
    -- Validasi perhitungan subtotal
    IF ABS((v_item->>'subtotal')::DECIMAL - ((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::DECIMAL)) > 0.01 THEN
      RAISE EXCEPTION 'Subtotal tidak sesuai dengan quantity x unit_price untuk item %', (v_item->>'item_id');
    END IF;
    
    -- Akumulasi total
    v_calculated_total := v_calculated_total + (v_item->>'subtotal')::DECIMAL;
    v_item_count := v_item_count + 1;
  END LOOP;
  
  -- Validasi total amount
  IF ABS(v_calculated_total - p_total_amount) > 0.01 THEN
    RAISE EXCEPTION 'Total amount (%) tidak sesuai dengan sum of items (%)', p_total_amount, v_calculated_total;
  END IF;

  -- 🚀 START ATOMIC TRANSACTION
  BEGIN
    -- 1️⃣ Insert transaction
    INSERT INTO transactions (
      transaction_number,
      customer_name,
      payment_method,
      total_amount,
      payment_amount,
      change_amount,
      user_id
    )
    VALUES (
      p_transaction_number,
      TRIM(p_customer_name),
      p_payment_method,
      p_total_amount,
      p_payment_amount,
      p_change_amount,
      p_user_id
    )
    RETURNING id INTO v_transaction_id;
    
    -- 2️⃣ Insert all transaction items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO transaction_items (
        transaction_id,
        item_id,
        quantity,
        unit_price,
        subtotal
      )
      VALUES (
        v_transaction_id,
        (v_item->>'item_id')::UUID,
        (v_item->>'quantity')::INTEGER,
        (v_item->>'unit_price')::DECIMAL,
        (v_item->>'subtotal')::DECIMAL
      );
    END LOOP;
    
    -- 3️⃣ Get complete transaction data untuk return
    SELECT row_to_json(t) INTO v_transaction_record
    FROM (
      SELECT 
        tr.id,
        tr.transaction_number,
        tr.customer_name,
        tr.payment_method,
        tr.total_amount,
        tr.payment_amount,
        tr.change_amount,
        tr.created_at,
        u.full_name as kasir_name,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'item_id', ti.item_id,
              'item_name', i.name,
              'quantity', ti.quantity,
              'unit_price', ti.unit_price,
              'subtotal', ti.subtotal
            )
          )
          FROM transaction_items ti
          JOIN items i ON ti.item_id = i.id
          WHERE ti.transaction_id = tr.id
        ) as items
      FROM transactions tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.id = v_transaction_id
    ) t;
    
    -- 🎉 SUCCESS: Return complete transaction
    RETURN json_build_object(
      'success', true,
      'message', 'Transaksi berhasil disimpan secara atomic',
      'transaction_id', v_transaction_id,
      'items_count', v_item_count,
      'total_amount', p_total_amount,
      'transaction', v_transaction_record
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- 🚫 ROLLBACK: Semua operasi dibatalkan otomatis
      RAISE EXCEPTION 'ATOMIC TRANSACTION FAILED: % (SEMUA DATA OTOMATIS DIBATALKAN)', SQLERRM;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction_with_items(
  transaction_data json,
  items_data json[]
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  new_transaction_id UUID;
  transaction_record JSON;
  item JSON;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert transaction
    INSERT INTO transactions (
      transaction_number,
      customer_name, 
      payment_method,
      total_amount,
      user_id
    )
    VALUES (
      transaction_data->>'transaction_number',
      transaction_data->>'customer_name',
      transaction_data->>'payment_method',
      (transaction_data->>'total_amount')::DECIMAL,
      (transaction_data->>'user_id')::UUID
    )
    RETURNING id INTO new_transaction_id;
    
    -- Insert transaction items
    FOR item IN SELECT * FROM json_array_elements(items_data)
    LOOP
      INSERT INTO transaction_items (
        transaction_id,
        item_id,
        quantity,
        unit_price,
        subtotal
      )
      VALUES (
        new_transaction_id,
        (item->>'item_id')::UUID,
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::DECIMAL,
        (item->>'subtotal')::DECIMAL
      );
    END LOOP;
    
    -- Return transaction with items
    SELECT row_to_json(t) INTO transaction_record
    FROM (
      SELECT 
        id,
        transaction_number,
        customer_name,
        total_amount,
        created_at
      FROM transactions 
      WHERE id = new_transaction_id
    ) t;
    
    RETURN transaction_record;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback akan otomatis terjadi
      RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get today's date in YYYYMMDD format
    SELECT TO_CHAR(NOW(), 'YYYYMMDD') INTO new_number;
    
    -- Count transactions today
    SELECT COUNT(*) + 1 INTO counter
    FROM transactions 
    WHERE created_at::date = CURRENT_DATE;
    
    -- Format: YYYYMMDD-001
    new_number := new_number || '-' || LPAD(counter::TEXT, 3, '0');
    
    RETURN new_number;
END;
$function$;

-- NOTE: function ini refer ke table public.user_profiles, 
-- yang di DB sekarang sudah drop, tapi tetap gue backup def‑nya.
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  full_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.username,
    up.full_name,
    up.role,
    up.is_active,
    up.created_at,
    up.updated_at
  FROM public.user_profiles up
  WHERE up.id = user_id AND up.is_active = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'kasir')
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_transaction_item()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  calculated_total DECIMAL;
  transaction_total DECIMAL;
BEGIN
  -- Ambil total amount dari transaksi
  SELECT total_amount INTO transaction_total
  FROM transactions 
  WHERE id = NEW.transaction_id;
  
  -- Hitung total dari items setelah insert/update
  SELECT COALESCE(SUM(subtotal), 0) INTO calculated_total
  FROM transaction_items 
  WHERE transaction_id = NEW.transaction_id;
  
  -- Jika ini adalah INSERT, tambahkan subtotal baru
  IF TG_OP = 'INSERT' THEN
    calculated_total := calculated_total + NEW.subtotal;
  END IF;
  
  -- Warning jika total tidak match (tapi tidak block, untuk fleksibilitas)
  IF ABS(calculated_total - transaction_total) > 0.01 THEN
    RAISE WARNING 'Transaction % total (%) may not match items total (%)',
      NEW.transaction_id, transaction_total, calculated_total;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------

-- Trigger di schema auth (link ke public.handle_new_user)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Triggers di public

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_item_on_insert
AFTER INSERT ON public.transaction_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_transaction_item();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_permissions_updated_at();

CREATE TRIGGER trigger_create_default_user_permissions
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_user_permissions();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- CRON JOB (pg_cron) UNTUK AUTO CLEANUP TRANSAKSI ORPHAN
-- ---------------------------------------------------------

-- Ini asumsikan extension pg_cron sudah aktif (lihat bagian atas)
SELECT cron.schedule(
  'cleanup-orphaned-transactions',    -- jobname
  '*/30 * * * *',                     -- tiap 30 menit
  $$SELECT cleanup_orphaned_transactions();$$
);

-- ---------------------------------------------------------
-- REALTIME (publication supabase_realtime)
-- ---------------------------------------------------------

-- Aktifkan realtime untuk tabel tertentu:
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_items;

-- =========================================================
-- END OF SNAPME SCHEMA BACKUP
-- =========================================================


