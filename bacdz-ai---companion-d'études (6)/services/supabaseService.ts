
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const supabaseUrl = 'https://gbipokaczytbuomrtovm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaXBva2Fjenl0YnVvbXJ0b3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk1MDc4MjcsImV4cCI6MjAzNTA4MzgyN30.sWKGN1Uayy06-gkBnhY7Yw_F6adV09Bq5aTzqZ5dJqY';

export class SupabaseService {
    private static client: SupabaseClient | null = null;

    private static getClient(): SupabaseClient {
        if (!this.client) {
            this.client = createClient(supabaseUrl, supabaseAnonKey);
        }
        return this.client;
    }

    static async getSession(): Promise<Session | null> {
        const { data, error } = await this.getClient().auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        return data.session;
    }

    static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        const { data: { subscription } } = this.getClient().auth.onAuthStateChange(callback);
        return subscription;
    }

    static async signIn(email: string, password: string) {
        return this.getClient().auth.signInWithPassword({ email, password });
    }

    static async signUp(email: string, password: string) {
        return this.getClient().auth.signUp({ email, password });
    }
    
    static async signInWithGoogle() {
        return this.getClient().auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
    }

    static async signOut() {
        return this.getClient().auth.signOut();
    }
    
    static async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await this.getClient()
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: "No rows found"
            console.error('Error fetching profile:', error);
            return null;
        }
        return data;
    }

    static async upsertProfile(userId: string, updates: Partial<UserProfile>) {
        const profileData = {
            id: userId,
            ...updates,
            updated_at: new Date(),
        };

        const { error } = await this.getClient()
            .from('profiles')
            .upsert(profileData);

        if (error) {
            console.error('Error upserting profile:', error);
        }
    }
}
