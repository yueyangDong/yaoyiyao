import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bumkuphgcfsmtxtynrhd.supabase.co';
const supabaseAnonKey = 'sb_publishable_DBEi6e6YGreh_o1-ilCYWA_8Ra6F4qZ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
