import { NotificationCategory } from '../events/enum';

export enum NotificationType {
    EMAIL = 'email',
    SMS = 'sms',
    IN_APP = 'in-app',
}

export interface NotificationEvent {
    eventType: string;
    targetUserIds: string[];
    payload: Record<string, any>;
}

export interface NotificationTemplate {
    id: string;
    eventType: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

export interface Notification {
    id?: string;
    userId: string;
    eventType: string;
    category: NotificationCategory;
    read: boolean;
    data?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface NotificationPreference {
    userId: string;
    channels: NotificationType[];
}

export interface DeliveryStatus {
    id: string;
    notificationId: string;
    channel: NotificationType;
    provider: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}
