import { EventEmitter } from 'events';
import { socketManager } from '..';
import { appConfig } from '../core/config';
import { ProviderRegistry } from '../providers/provider-registry';
import { NotificationRepository } from '../repositories/notification-repository';
import { Notification, NotificationEvent, NotificationType } from '../types';
import { PreferenceService } from './preference.service';
import { TemplateEngine } from './template-engine.service';

export class NotificationService {
    private static instance: NotificationService;
    private eventEmitter: EventEmitter;
    private providerRegistry: ProviderRegistry;
    private repository: NotificationRepository;
    private templateEngine: TemplateEngine;
    private preferenceService: PreferenceService;

    private constructor() {
        this.eventEmitter = new EventEmitter();
        this.providerRegistry = ProviderRegistry.getInstance();
        this.repository = new NotificationRepository();
        this.templateEngine = new TemplateEngine();
        this.preferenceService = new PreferenceService();

        this.setupEventListeners();
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private setupEventListeners(): void {
        this.eventEmitter.on('notification:event', this.handleNotificationEvent.bind(this));
    }

    public async publishEvent(event: NotificationEvent): Promise<void> {
        this.eventEmitter.emit('notification:event', event);
    }

    private async handleNotificationEvent(event: NotificationEvent): Promise<void> {
        try {
            for (const userId of event.targetUserIds) {
                const preferences = await this.preferenceService.getUserPreferences(userId, event.eventType);

                if (!preferences || !preferences.enabled) {
                    console.log(`Notification skipped for user ${userId} due to preferences`);

                    continue;
                }

                const renderedNotification = await this.templateEngine.renderTemplate(event.eventType, {
                    ...event.payload,
                    userId,
                });

                const notification: Notification = {
                    userId,
                    eventType: event.eventType,
                    category: event.category,
                    title: renderedNotification.title,
                    body: renderedNotification.body,
                    read: false,
                    data: {
                        ...renderedNotification.data,
                        ...event.payload,
                        metadata: event.metadata,
                    },
                    createdAt: new Date(),
                };

                const savedNotification = await this.repository.createNotification(notification);

                for (const channel of preferences.channels) {
                    await this.sendToChannel(savedNotification, channel);
                }
            }
        } catch (error) {
            console.error('Error handling notification event:', error);
        }
    }

    private async sendToChannel(notification: Notification, channel: NotificationType): Promise<void> {
        try {
            const provider = this.getProviderForChannel(channel);

            if (!provider) {
                console.error(`No provider configured for channel ${channel}`);

                return;
            }

            await provider.send(notification);

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

    private async sendNotificationToUser(userId: string, notification: Notification): Promise<boolean> {
        try {
            const savedNotification = await this.repository.createNotification({
                ...notification,
                userId,
            });

            const delivered = socketManager.sendToUser(userId, 'notification', savedNotification);

            await this.repository.updateDeliveryStatus({
                notificationId: savedNotification.id!,
                channel: NotificationType.IN_APP,
                provider: 'socket.io',
                status: delivered ? 'delivered' : 'pending',
            });

            return delivered;
        } catch (error) {
            console.error('Error sending notification to user:', error);
            return false;
        }
    }

    private getProviderForChannel(channel: NotificationType): any {
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
