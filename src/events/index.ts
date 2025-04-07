import { NotificationType } from '@/core';
import { NotificationCategory } from './enum';
import { EventConfig } from './interface';

export const events: EventConfig[] = [
    {
        slug: 'welcome_signup',
        title: 'Welcome Signup',
        type: 'info',
        description: 'Sent when a user signs up for the first time',
        category: NotificationCategory.TO_ACCOUNT_SETUP,
        [NotificationType.IN_APP]: 'default',
        [NotificationType.EMAIL]: 'hackathon_invitation',
        actionButtons: [
            {
                type: 'redirect',
                label: 'View Hackathon',
                route: '/hackathons',
            },
        ],
    },
];
