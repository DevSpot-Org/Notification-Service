import { socketManager } from '../../index';
import { Notification, NotificationType } from '@/core';
import { BaseNotificationProvider } from '../provider-interface';

export class DatabaseProvider extends BaseNotificationProvider {
    constructor() {
        super('socket.io', NotificationType.IN_APP);
    }

    public async send(notification: Notification): Promise<void> {
        try {
            console.log(`[Database] Sending in-app notification`);

            socketManager.sendToUser(notification.userId, 'notification', notification);

            console.log(`[Database] In-app notification sent to user ${notification.userId}`);
        } catch (error) {
            console.error('[Database] Error sending in-app notification:', error);
            throw error;
        }
    }
}
