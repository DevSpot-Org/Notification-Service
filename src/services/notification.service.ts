import { appConfig } from '../core/config';
import { BadRequestError } from '../core/errors';
import { events } from '../events';
import { EventConfig } from '../events/interface';
import { NotificationProvider } from '../providers/provider-interface';
import { ProviderRegistry } from '../providers/provider-registry';
import { NotificationRepository } from '../repositories/notification-repository';
import { PreferenceRepository } from '../repositories/preference-repository';
import { Notification, NotificationEvent, NotificationType } from '../types';
import { TemplateParser } from './template.service';

export class NotificationService {
    private static instance: NotificationService;
    private providerRegistry: ProviderRegistry;
    private repository: NotificationRepository;
    private templateParser: TemplateParser;
    private preferenceRepository: PreferenceRepository;
    private events: EventConfig[];

    private constructor() {
        this.providerRegistry = ProviderRegistry.getInstance();
        this.repository = new NotificationRepository();
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

    public async publishEvent(event: NotificationEvent): Promise<void> {
        const eventConfig = this.findEventBySlug(event.eventType);

        if (!eventConfig) {
            throw new BadRequestError(`Event not found: ${event.eventType}`);
        }

        for (const userId of event.targetUserIds) {
            const preferences = await this.preferenceRepository.getUserPreference(userId);

            if (!preferences) {
                console.log(`Notification skipped for user ${userId} due to preferences`);

                continue;
            }

            for (const channel of preferences.channels) {
                if (!eventConfig[channel]) continue;

                this.validateEventTemplateAgainstVariables(channel, eventConfig, event.payload);
            }

            const notification: Notification = {
                userId,
                eventType: event.eventType,
                category: eventConfig.category,
                read: false,
                data: event.payload,
                createdAt: new Date(),
            };

            const savedNotification = await this.repository.createNotification(notification);

            for (const channel of preferences.channels) {
                if (!eventConfig[channel]) continue;

                const templateContent = await this.templateParser.getTemplateFromEvent(channel, eventConfig[channel]);

                const renderedContent = this.templateParser.renderTemplate(templateContent, event.payload);

                await this.sendToChannel(savedNotification, channel, renderedContent);
            }
        }
    }

    private async sendToChannel(notification: Notification, channel: NotificationType, content: string): Promise<void> {
        try {
            const provider = this.getProviderForChannel(channel);

            if (!provider) {
                console.error(`No provider configured for channel ${channel}`);

                return;
            }

            await provider.send(notification, content);

            await this.repository.updateDeliveryStatus({
                notificationId: notification.id!,
                channel,
                provider: provider.name,
                status: 'sent',
            });
        } catch (error) {
            console.error(`Error sending notification through ${channel}:`, error);

            await this.repository.updateDeliveryStatus({
                notificationId: notification.id!,
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
            case NotificationType.IN_APP:
                providerName = appConfig.providers.inApp.default;
                break;
        }

        return this.providerRegistry.getProvider(channel, providerName);
    }

    private async validateEventTemplateAgainstVariables(channel: NotificationType, eventConfig: EventConfig, payload: Record<any, any>) {
        try {
            const templateContent = await this.templateParser.getTemplateFromEvent(channel, eventConfig[channel]!);

            const parseResult = this.templateParser.parseTemplate(templateContent);

            const templateRequiredVariables = parseResult.requiredVariables;

            this.templateParser.validateDataAgainstRequiredVariables(templateRequiredVariables, payload);
        } catch (error: any) {
            throw new BadRequestError(`Template parsing failed. Ensure the template string is valid. - ${error?.message}`);
        }
    }

    public async markAsRead(notificationId: string): Promise<void> {
        await this.repository.markAsRead(notificationId);
    }

    public async markAllAsRead(userId: string): Promise<void> {
        await this.repository.markAllAsRead(userId);
    }

    public async getUserNotifications(userId: string, options?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<Notification[]> {
        return this.repository.getUserNotifications(userId, options);
    }

    public async getUnreadCount(userId: string): Promise<number> {
        return this.repository.getUnreadCount(userId);
    }
}
