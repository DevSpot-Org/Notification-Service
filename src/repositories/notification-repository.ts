import { DeliveryStatus, GetUserNotificationsOptions, GroupedNotifications, Notification, NotificationAction, NotificationMessageType, supabase } from '@/core';
import { createClient } from '@supabase/supabase-js';
import { Server } from 'socket.io';
import { NotificationCategory } from '../events/enum';

export class NotificationRepository {
    private supabase: ReturnType<typeof createClient>;

    constructor() {
        this.supabase = supabase;
    }

    public async createNotification(notification: Notification): Promise<Notification> {
        const { data, error } = await this.supabase
            .from('notifications')
            .insert({
                user_id: notification.userId,
                type: notification.type,
                title: notification.title,
                content: notification.content,
                category: notification.category,
                action: notification.action,
                read: notification.read,
                metadata: notification.metadata,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            throw new Error(`Failed to create notification: ${error.message}`);
        }

        return {
            id: data.id as string,
            userId: data.user_id as string,
            title: data.title as string,
            content: data.content as string,
            category: data.category as NotificationCategory,
            type: data.type as NotificationMessageType,
            action: data.action as NotificationAction,
            read: data.read as boolean,
            metadata: {
                eventType: data.event_type as string,
                ...((data.metadata as Record<string, any>) || {}),
            },
            createdAt: new Date(data.created_at as string),
            updatedAt: data.updated_at ? new Date(data.updated_at as string) : undefined,
        };
    }

    public async updateDeliveryStatus(delivery: Partial<DeliveryStatus>): Promise<void> {
        const { error } = await this.supabase.from('notification_delivery_status').upsert({
            user_id: delivery.userId,
            channel: delivery.channel,
            provider: delivery.provider,
            status: delivery.status,
            metadata: delivery.metadata,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            console.error('Error updating delivery status:', error);
            throw new Error(`Failed to update delivery status: ${error.message}`);
        }
    }

    public async markAsRead(notificationId: string): Promise<void> {
        const { error } = await this.supabase
            .from('notifications')
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
            throw new Error(`Failed to mark notification as read: ${error.message}`);
        }
    }

    public async markAllAsRead(userId: string): Promise<void> {
        const { error } = await this.supabase
            .from('notifications')
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            throw new Error(`Failed to mark all notifications as read: ${error.message}`);
        }
    }

    public async getUserInAppNotifications(
        userId: string,
        options: Partial<GetUserNotificationsOptions> = {},
    ): Promise<Notification[] | GroupedNotifications> {
        let query = this.supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });

        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.unreadOnly) {
            query = query.eq('read', false);
        }

        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error getting user notifications:', error);
            throw new Error(`Failed to get user notifications: ${error.message}`);
        }

        const notifications = data.map((item) => ({
            id: item.id as string,
            userId: item.user_id as string,
            title: item.title as string,
            content: item.content as string,
            category: item.category as NotificationCategory,
            type: item.type as NotificationMessageType,
            action: item.action as NotificationAction,
            read: item.read as boolean,
            metadata: {
                eventType: item.event_type as string,
                ...((item.metadata as Record<string, any>) || {}),
            },
            createdAt: new Date(item.created_at as string),
            updatedAt: item.updated_at ? new Date(item.updated_at as string) : undefined,
        }));

        if (options.sortByDate) {
            return this.groupNotificationsByDate(notifications);
        }

        return notifications;
    }

    private groupNotificationsByDate(notifications: Notification[]): GroupedNotifications {
        // Get today's start (00:00)
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Yesterday's start (subtract one day)
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(todayStart.getDate() - 1);

        // Assuming the week starts on Monday:
        const dayOfWeek = todayStart.getDay(); // Sunday = 0, Monday = 1, etc.
        // Convert so that Monday is 0. (For Sunday, (0+6)%7 = 6)
        const diffToMonday = (dayOfWeek + 6) % 7;
        const startOfWeek = new Date(todayStart);
        startOfWeek.setDate(todayStart.getDate() - diffToMonday);

        // Last week is the week before the start of this week.
        const lastWeekStart = new Date(startOfWeek);
        lastWeekStart.setDate(startOfWeek.getDate() - 7);

        const grouped: GroupedNotifications = {
            today: [],
            yesterday: [],
            earlierThisWeek: [],
            lastWeek: [],
            older: [],
        };

        notifications.forEach((notification) => {
            const createdAt = new Date(notification.createdAt as Date);

            if (createdAt >= todayStart) {
                grouped.today.push(notification);
            } else if (createdAt >= yesterdayStart && createdAt < todayStart) {
                grouped.yesterday.push(notification);
            } else if (createdAt >= startOfWeek && createdAt < yesterdayStart) {
                grouped.earlierThisWeek.push(notification);
            } else if (createdAt >= lastWeekStart && createdAt < startOfWeek) {
                grouped.lastWeek.push(notification);
            } else {
                grouped.older.push(notification);
            }
        });

        return grouped;
    }

    public async getUnreadCount(userId: string): Promise<number> {
        const { count, error } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error getting unread count:', error);
            throw new Error(`Failed to get unread count: ${error.message}`);
        }

        return count || 0;
    }

    public static setupNotificationSubscription(supabase: ReturnType<typeof createClient>, io: Server): void {
        // Subscribe to changes in the notifications table
        supabase
            .channel('notifications-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    const notification = payload.new;

                    io.to(`user:${notification.user_id}`).emit('notification', {
                        id: notification.id,
                        userId: notification.user_id,
                        eventType: notification.event_type,
                        category: notification.category,
                        read: notification.read,
                        data: notification.data,
                        createdAt: new Date(notification.created_at),
                    });
                },
            )
            .subscribe();

        console.log('Supabase notification subscription set up');
    }
}
