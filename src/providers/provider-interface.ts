import { Notification, NotificationType } from '../types';

export interface NotificationProvider {
    name: string;
    type: NotificationType;
    send(notification: Notification): Promise<void>;
}

export abstract class BaseNotificationProvider implements NotificationProvider {
    name: string;
    type: NotificationType;

    constructor(name: string, type: NotificationType) {
        this.name = name;
        this.type = type;
    }

    abstract send(notification: Notification): Promise<void>;

    protected processTemplate(content: string, data: Record<string, any>): string {
        // Simple placeholder replacement
        return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }
}
