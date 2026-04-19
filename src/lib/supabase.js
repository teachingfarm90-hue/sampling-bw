import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function testConnection() {
  try {
    const { error } = await supabase.from('kandangs').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}
