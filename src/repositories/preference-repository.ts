import { createClient } from '@supabase/supabase-js';
import { supabase } from '../index';
import { NotificationPreference, NotificationType } from '../types';

export class PreferenceRepository {
    private supabase: ReturnType<typeof createClient>;

    constructor() {
        this.supabase = supabase;
    }

    public async getUserPreference(userId: string): Promise<NotificationPreference | null> {
        const { data, error } = await this.supabase.from('users').select('id, notification_preferences').eq('id', userId).single();
        if (error) {
            if (error.code === 'PGRST116') {
                // No user found with this id
                return null;
            }
            console.error('Error getting user preference:', error);
            throw new Error(`Failed to get user preference: ${error.message}`);
        }

        const channels = data.notification_preferences as NotificationType[];

        return {
            userId: data.id as string,
            channels,
        };
    }

    public async savePreference(preference: NotificationPreference): Promise<void> {
        const { channels, userId } = preference;

        const { error } = await this.supabase
            .from('users')
            .update({
                notification_preferences: channels,
            })
            .eq('id', userId);

        if (error) {
            console.error('Error saving preference:', error);
            throw new Error(`Failed to save preference: ${error.message}`);
        }
    }
}
