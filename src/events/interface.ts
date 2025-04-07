import { NotificationMessageType, NotificationType } from '@/core';
import { NotificationCategory } from './enum';
import { emailTemplates } from './templates/email';
import { inAppTemplates } from './templates/in-app';
import { smsTemplates } from './templates/sms';

export type TemplateRegistryMap = {
    [NotificationType.EMAIL]: typeof emailTemplates;
    [NotificationType.SMS]: typeof smsTemplates;
    [NotificationType.IN_APP]: typeof inAppTemplates;
};

type NotificationTemplates = {
    [T in NotificationType]?: keyof TemplateRegistryMap[T];
};

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = { [K in Keys]: Required<Pick<T, K>> & Partial<Omit<T, K>> }[Keys];

interface RedirectEventActionButton {
    type: 'redirect';
    route: string;
}

interface ApiCallEventActionButton {
    type: 'apiCall';
    method: 'POST' | 'GET';
    endpoint: string;
    data: any;
}

type EventActionButton = (ApiCallEventActionButton | RedirectEventActionButton) & {
    label: string;
};

interface BaseEventConfig {
    slug: string;
    title: string;
    category: NotificationCategory;
    type: NotificationMessageType;
    description?: string;
    actionButtons: EventActionButton[];
}

export type EventConfig = BaseEventConfig & RequireAtLeastOne<NotificationTemplates>;
