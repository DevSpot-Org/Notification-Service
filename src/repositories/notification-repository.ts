import { DeliveryStatus, Notification, NotificationType, supabase } from '@/core';
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
                event_type: notification.eventType,
                category: notification.category,
                read: notification.read,
                data: notification.data,
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
            eventType: data.event_type as string,
            category: data.category as NotificationCategory,
            read: data.read as boolean,
            data: data.data as Record<string, any> | undefined,
            createdAt: new Date(data.created_at as string),
            updatedAt: data.updated_at ? new Date(data.updated_at as string) : undefined,
        };
    }

    public async updateDeliveryStatus(delivery: Partial<DeliveryStatus>): Promise<void> {
        const { error } = await this.supabase.from('notification_delivery_status').upsert({
            notification_id: delivery.notificationId,
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
        options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
    ): Promise<Notification[]> {
        let query = this.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .in(
                'id',
                (await this.supabase.from('notification_delivery_status').select('notification_id').eq('channel', NotificationType.IN_APP)).data?.map(
                    (nds) => nds.notification_id,
                ) ?? [],
            )
            .order('created_at', { ascending: false });

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

        return data.map((item) => ({
            id: item.id as string,
            userId: item.user_id as string,
            eventType: item.event_type as string,
            category: item.category as NotificationCategory,
            read: item.read as boolean,
            data: item.data as Record<string, any> | undefined,
            createdAt: new Date(item.created_at as string),
            updatedAt: item.updated_at ? new Date(item.updated_at as string) : undefined,
        }));
    }

    public async getUnreadCount(userId: string): Promise<number> {
        const { count, error } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false)
            .in(
                'id',
                (
                    await this.supabase.from('notification_delivery_status').select('notification_id').eq('channel', NotificationType.IN_APP)
                ).data?.map((nds) => nds.notification_id) ?? [],
            );

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
