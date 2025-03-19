import { Notification, NotificationType } from '@/core';

export interface NotificationProvider {
    name: string;
    type: NotificationType;
    send(notification: Notification, content: string): Promise<void>;
}

export abstract class BaseNotificationProvider implements NotificationProvider {
    name: string;
    type: NotificationType;

    constructor(name: string, type: NotificationType) {
        this.name = name;
        this.type = type;
    }

    abstract send(notification: Notification, content: string): Promise<void>;
}
