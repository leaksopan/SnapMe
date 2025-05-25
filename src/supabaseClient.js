import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://auzfgedsysmqnpryudcg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1emZnZWRzeXNtcW5wcnl1ZGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNDg3MTAsImV4cCI6MjA2MzcyNDcxMH0.l092wD3-XFvxXQWppjz45ZIoZ0Nhllru0cFbfUt4iMw'

export const supabase = createClient(supabaseUrl, supabaseKey) 