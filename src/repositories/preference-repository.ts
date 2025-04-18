import { createClient } from '@supabase/supabase-js';
import {supabase, NotificationPreference, NotificationType } from '@/core';

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

        const allChannels = data.notification_preferences as NotificationType[];
        const userChannels = allChannels.filter((channel: NotificationType) => channel !== NotificationType.IN_APP);


        return {
            userId: data.id as string,
            channels: userChannels,
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
