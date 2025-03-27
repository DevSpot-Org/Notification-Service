import { NotificationType } from '@/core';
import { User } from '@/repositories';

export interface NotificationProvider {
    name: string;
    type: NotificationType;
    send(user: User, content: string): Promise<void>;
}

export abstract class BaseNotificationProvider implements NotificationProvider {
    name: string;
    type: NotificationType;

    constructor(name: string, type: NotificationType) {
        this.name = name;
        this.type = type;
    }

    abstract send(user: User, content: string): Promise<void>;
}
