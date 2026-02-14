import { createClient } from '@supabase/supabase-js';

// Accessing Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
console.error('Supabase configuration is missing! Check Netlify environment variables.');
}

export const supabase = createClient(
supabaseUrl || '',
supabaseAnonKey || ''
);