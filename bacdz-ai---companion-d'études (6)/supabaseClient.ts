
import { createClient } from '@supabase/supabase-js';

// It is recommended to use environment variables for these values.
const supabaseUrl = 'https://gbipokaczytbuomrtovm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaXBva2Fjenl0YnVvbXJ0b3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0OTg1ODgsImV4cCI6MjAzNzA3NDU4OH0.sWKGN1Uayy06-gkBnhY7Yw_F6adV09BqLgC8IkP-f-g';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
