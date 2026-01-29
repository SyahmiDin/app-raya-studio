// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Kalau environment variable tak jumpa (masa build), guna string kosong/dummy
// Ini teknik untuk elak Vercel error "supabaseKey is required"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Trigger redeploy