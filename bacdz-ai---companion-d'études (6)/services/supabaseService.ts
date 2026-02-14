
import { supabase } from '../supabaseClient';
import { UserProfile, UserRole } from '../types';
import { AuthError, Session } from '@supabase/supabase-js';

export class SupabaseService {

  static async signUp(email: string, password: string): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { session: data.session, error };
  }

  static async signIn(email: string, password: string): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { session: data.session, error };
  }

  static async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    return { error };
  }

  static async signOut(): Promise<{ error: AuthError | null }> {
    return await supabase.auth.signOut();
  }

  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  }
  
  static async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "object not found"
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }

  static async upsertProfile(userId: string, updates: Partial<UserProfile>): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
      .select()
      .single();
      
    return { data, error };
  }
}
