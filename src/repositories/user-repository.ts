import { supabase } from '@/core';
import { createClient } from '@supabase/supabase-js';

export interface User {
    userId: string;
    email: string;
    phone: string;
}

export class UserRepository {
    private supabase: ReturnType<typeof createClient>;

    constructor() {
        this.supabase = supabase;
    }

    public async getUser(userId: string): Promise<User | null> {
        const { data, error } = await this.supabase.from('users').select('id, email').eq('id', userId).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No user found
                return null;
            }
            console.error('Error fetching user data:', error);
            throw new Error(`Failed to fetch user data: ${error.message}`);
        }

        let email = data.email as string;

        return {
            userId: data.id as string,
            email,
            phone: '',
        };
    }
}
