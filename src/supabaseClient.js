import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://auzfgedsysmqnpryudcg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1emZnZWRzeXNtcW5wcnl1ZGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNDg3MTAsImV4cCI6MjA2MzcyNDcxMH0.l092wD3-XFvxXQWppjz45ZIoZ0Nhllru0cFbfUt4iMw'

// Client untuk operasi normal dengan konfigurasi realtime yang disederhanakan
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Nonaktifkan auto refresh token karena kita tidak menggunakan Supabase Auth
    autoRefreshToken: false,
    // Nonaktifkan persist session
    persistSession: false,
    // Nonaktifkan deteksi URL untuk auth
    detectSessionInUrl: false
  },
  realtime: {
    // Konfigurasi realtime yang minimal dan aman
    heartbeatIntervalMs: 30000
  }
}) 
