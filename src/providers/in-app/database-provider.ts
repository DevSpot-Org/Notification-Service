import { io } from '../../index';
import { Notification, NotificationType } from '../../types';
import { BaseNotificationProvider } from '../provider-interface';

export class DatabaseProvider extends BaseNotificationProvider {
    constructor() {
        super('database', NotificationType.IN_APP);
    }

    public async send(notification: Notification): Promise<void> {
        try {
            // For in-app notifications, we simply emit to the socket
            // The notification is already saved in the database by the notification service
            console.log(`[Database] Sending in-app notification: ${notification.title}`);

            // Emit to the specific user's room
            io.to(`user:${notification.userId}`).emit('notification', {
                id: notification.id,
                title: notification.title,
                body: notification.body,
                category: notification.category,
                eventType: notification.eventType,
                read: notification.read,
                data: notification.data,
                createdAt: notification.createdAt,
            });

            console.log(`[Database] In-app notification sent to user ${notification.userId}`);
        } catch (error) {
            console.error('[Database] Error sending in-app notification:', error);
            throw error;
        }
    }
}
