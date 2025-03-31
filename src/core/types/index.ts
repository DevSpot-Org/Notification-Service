import { NotificationCategory } from '@/events/enum';

export enum NotificationType {
    EMAIL = 'email',
    SMS = 'sms',
    IN_APP = 'in-app',
}

export interface NotificationEvent {
    eventType: string;
    userId: string;
    payload: Record<string, any>;
}

export interface NotificationTemplate {
    id: string;
    eventType: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

export type NotificationMessageType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationAction {
    url: string;
    label: string;
}

export interface Notification {
    id?: string;
    userId: string;
    title: string;
    content: string;
    type: NotificationMessageType;
    category: NotificationCategory;
    action?: NotificationAction;
    read: boolean;
    metadata: {
        eventType: string;
        [key: string]: any;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface NotificationPreference {
    userId: string;
    channels: NotificationType[];
}

export interface DeliveryStatus {
    id: string;
    userId: string;
    channel: NotificationType;
    provider: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}

export interface GroupedNotifications {
    today: Notification[];
    yesterday: Notification[];
    earlierThisWeek: Notification[];
    lastWeek: Notification[];
    older: Notification[];
}

export interface GetUserNotificationsOptions {
    limit: number;
    offset: number;
    unreadOnly: boolean;
    sortByDate: boolean;
}
