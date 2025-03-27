import { NotificationType } from '@/core';
import express from 'express';
import { validateSchema } from '../core/utils';
import { PreferenceRepository } from '../repositories/preference-repository';
import { NotificationService } from '../services/notification.service';
import {
    getUserNotificationsQuerySchema,
    notificationIdParamSchema,
    sendEventSchema,
    updatePreferenceBodySchema,
    updatePreferenceParamsSchema,
    userIdParamSchema,
} from './notification-schema';

const router = express.Router();
const notificationService = NotificationService.getInstance();
const preferenceService = new PreferenceRepository();

// Get user notifications
router.get(
    '/user/:userId',
    validateSchema(userIdParamSchema, 'params'),
    validateSchema(getUserNotificationsQuerySchema, 'query'),
    async (req, res) => {
        try {
            const userId = req.params.userId;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

            const notifications = await notificationService.getUserNotifications(userId, { limit, offset });

            res.json({ success: true, notifications });
        } catch (error) {
            console.error('Error getting user notifications:', error);
            res.status(500).json({ success: false, error: 'Failed to get notifications' });
        }
    },
);

// Get user unread count
router.get('/user/:userId/unread', validateSchema(userIdParamSchema, 'params'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const count = await notificationService.getUnreadCount(userId);

        res.json({ success: true, count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ success: false, error: 'Failed to get unread count' });
    }
});

// Mark notification as read
router.post('/read/:notificationId', validateSchema(notificationIdParamSchema, 'params'), async (req, res) => {
    try {
        const notificationId = req.params.notificationId;
        await notificationService.markAsRead(notificationId);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.post('/read-all/:userId', validateSchema(userIdParamSchema, 'params'), async (req, res) => {
    try {
        const userId = req.params.userId;
        await notificationService.markAllAsRead(userId);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all notifications as read',
        });
    }
});

// Get user notification preferences
router.get('/preferences/:userId', validateSchema(userIdParamSchema, 'params'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const preferences = await preferenceService.getUserPreference(userId);

        res.json({ success: true, preferences });
    } catch (error) {
        console.error('Error getting user preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to get user preferences' });
    }
});

// Update notification preference
router.post(
    '/preferences/:userId/:eventType',
    validateSchema(updatePreferenceParamsSchema, 'params'),
    validateSchema(updatePreferenceBodySchema, 'body'),
    async (req, res) => {
        try {
            const userId = req.params.userId;
            const { channels } = req.body;

            await preferenceService.savePreference({
                userId,
                channels: channels as NotificationType[],
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating preference:', error);
            res.status(500).json({ success: false, error: 'Failed to update preference' });
        }
    },
);

// Send notification event
router.post('/send-event', validateSchema(sendEventSchema, 'body'), async (req, res, next) => {
    try {
        const { eventType, userId, payload } = req.body;

        await notificationService.publishEvent({
            eventType,
            userId,
            payload,
        });

        res.json({ success: true });
    } catch (error: any) {
        next(error);
    }
});

export const notificationRoutes = router;
