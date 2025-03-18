import { PreferenceRepository } from '../repositories/preference-repository';
import { NotificationEventType, NotificationPreference, NotificationType } from '../types';

export class PreferenceService {
    private repository: PreferenceRepository;

    constructor() {
        this.repository = new PreferenceRepository();
    }

    public async getUserPreferences(userId: string, eventType: NotificationEventType): Promise<NotificationPreference | null> {
        try {
            const preference = await this.repository.getUserPreference(userId, eventType);

            if (!preference) {
                // If no preference exists, create a default one
                const defaultPreference: NotificationPreference = {
                    userId,
                    eventType,
                    channels: [NotificationType.IN_APP],
                    enabled: true,
                };

                await this.repository.savePreference(defaultPreference);
                return defaultPreference;
            }

            return preference;
        } catch (error) {
            console.error('Error getting user preferences:', error);
            return null;
        }
    }

    public async updatePreference(preference: NotificationPreference): Promise<void> {
        await this.repository.savePreference(preference);
    }

    public async bulkUpdatePreferences(
        userId: string,
        preferences: {
            eventType: NotificationEventType;
            enabled: boolean;
            channels: NotificationType[];
        }[],
    ): Promise<void> {
        for (const pref of preferences) {
            await this.repository.savePreference({
                userId,
                eventType: pref.eventType,
                enabled: pref.enabled,
                channels: pref.channels,
            });
        }
    }

    public async getAllUserPreferences(userId: string): Promise<NotificationPreference[]> {
        return this.repository.getAllUserPreferences(userId);
    }
}
