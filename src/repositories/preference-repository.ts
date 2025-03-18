import { createClient } from '@supabase/supabase-js';
import { supabase } from '../index';
import { NotificationEventType, NotificationPreference, NotificationType } from '../types';

export class PreferenceRepository {
    private supabase: ReturnType<typeof createClient>;

    constructor() {
        this.supabase = supabase;
    }

    public async getUserPreference(userId: string, eventType: NotificationEventType): Promise<NotificationPreference | null> {
        const { data, error } = await this.supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .eq('event_type', eventType)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No preference found
                return null;
            }
            console.error('Error getting user preference:', error);
            throw new Error(`Failed to get user preference: ${error.message}`);
        }

        return {
            userId: data.user_id as string,
            eventType: data.event_type as NotificationEventType,
            channels: data.channels as NotificationType[],
            enabled: data.enabled as boolean,
        };
    }

    public async savePreference(preference: NotificationPreference): Promise<void> {
        const { error } = await this.supabase.from('notification_preferences').upsert({
            user_id: preference.userId,
            event_type: preference.eventType,
            channels: preference.channels,
            enabled: preference.enabled,
        });

        if (error) {
            console.error('Error saving preference:', error);
            throw new Error(`Failed to save preference: ${error.message}`);
        }
    }

    public async getAllUserPreferences(userId: string): Promise<NotificationPreference[]> {
        const { data, error } = await this.supabase.from('notification_preferences').select('*').eq('user_id', userId);

        if (error) {
            console.error('Error getting all user preferences:', error);

            throw new Error(`Failed to get all user preferences: ${error.message}`);
        }

        return data.map((item) => ({
            userId: item.user_id as string,
            eventType: item.event_type as NotificationEventType,
            channels: item.channels as NotificationType[],
            enabled: item.enabled as boolean,
        }));
    }
}
