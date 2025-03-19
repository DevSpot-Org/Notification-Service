import { NotificationType } from '../types';
import { NotificationCategory } from './enum';
import { EventConfig } from './interface';

export const events: EventConfig[] = [
    {
        slug: 'welcome_signup',
        title: 'Welcome Signup',
        description: 'Sent when a user signs up for the first time',
        category: NotificationCategory.TO_ACCOUNT_SETUP,
        [NotificationType.SMS]: 'default',
        [NotificationType.EMAIL]: 'hackathon_invitation',
    },
];
