import { Notification, NotificationEvent, NotificationType } from '@/core';
import { User, UserRepository } from '@/repositories';
import { socketManager } from '..';
import { appConfig } from '../core/config';
import { BadRequestError } from '../core/errors';
import { events } from '../events';
import { EventConfig } from '../events/interface';
import { NotificationProvider } from '../providers/provider-interface';
import { ProviderRegistry } from '../providers/provider-registry';
import { NotificationRepository } from '../repositories/notification-repository';
import { PreferenceRepository } from '../repositories/preference-repository';
import { TemplateParser } from './template.service';

export class NotificationService {
    private static instance: NotificationService;
    private providerRegistry: ProviderRegistry;
    private repository: NotificationRepository;
    private userRepository: UserRepository;
    private templateParser: TemplateParser;
    private preferenceRepository: PreferenceRepository;
    private events: EventConfig[];

    private constructor() {
        this.providerRegistry = ProviderRegistry.getInstance();
        this.repository = new NotificationRepository();
        this.userRepository = new UserRepository();
        this.preferenceRepository = new PreferenceRepository();
        this.events = events;
        this.templateParser = new TemplateParser();
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private findEventBySlug(slug: string): EventConfig | undefined {
        return this.events.find((event) => event.slug === slug);
    }

    public async publishEvent(payload: NotificationEvent): Promise<void> {
        const { eventType, payload: data, userId } = payload;

        const event = this.findEventBySlug(eventType);

        if (!event) {
            throw new BadRequestError(`Event not found: ${eventType}`);
        }

        const user = await this.userRepository.getUser(userId);

        if (!user) {
            throw new BadRequestError(`User not found: ${userId}`);
        }

        if (event['in-app']) {
            const notification: Notification = {
                userId,
                eventType,
                category: event.category,
                read: false,
                data,
                createdAt: new Date(),
            };

            const savedNotification = await this.repository.createNotification(notification);

            socketManager.sendToUser(savedNotification.userId, 'notification', savedNotification);
        }

        const preferences = await this.preferenceRepository.getUserPreference(userId);

        if (!preferences) {
            console.log(`Notification skipped for user ${userId} due to preferences`);

            return;
        }

        for (const channel of preferences.channels) {
            if (!event[channel]) continue;

            const templateContent = await this.templateParser.getTemplateFromEvent(channel, event[channel]!);

            const parseResult = this.templateParser.parseTemplate(templateContent);

            const templateRequiredVariables = parseResult.requiredVariables;

            this.templateParser.validateDataAgainstRequiredVariables(templateRequiredVariables, payload);

            const renderedContent = this.templateParser.renderTemplate(templateContent, data);

            await this.sendToChannel(user, channel, renderedContent);
        }
    }

    private async sendToChannel(user: User, channel: NotificationType, content: string): Promise<void> {
        try {
            const provider = this.getProviderForChannel(channel);

            if (!provider) {
                console.error(`No provider configured for channel ${channel}`);

                return;
            }

            await provider.send(user, content);

            await this.repository.updateDeliveryStatus({
                userId: user.userId,
                channel,
                provider: provider.name,
                status: 'sent',
            });
        } catch (error) {
            console.error(`Error sending notification through ${channel}:`, error);

            await this.repository.updateDeliveryStatus({
                userId: user.userId,
                channel,
                provider: this.getProviderForChannel(channel)?.name || 'unknown',
                status: 'failed',
                metadata: { error: (error as Error).message },
            });
        }
    }

    private getProviderForChannel(channel: NotificationType): NotificationProvider | undefined {
        let providerName = '';

        switch (channel) {
            case NotificationType.EMAIL:
                providerName = appConfig.providers.email.default;
                break;
            case NotificationType.SMS:
                providerName = appConfig.providers.sms.default;
                break;
        }

        return this.providerRegistry.getProvider(channel, providerName);
    }

    public async markAsRead(notificationId: string): Promise<void> {
        await this.repository.markAsRead(notificationId);
    }

    public async markAllAsRead(userId: string): Promise<void> {
        await this.repository.markAllAsRead(userId);
    }

    public async getUserNotifications(userId: string, options?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<Notification[]> {
        return this.repository.getUserInAppNotifications(userId, options);
    }

    public async getUnreadCount(userId: string): Promise<number> {
        return this.repository.getUnreadCount(userId);
    }
}
