import express from 'express';
import { NotificationService } from '../services/notification.service';
import { PreferenceService } from '../services/preference.service';
import { NotificationEventType, NotificationType } from '../types';

const router = express.Router();
const notificationService = NotificationService.getInstance();
const preferenceService = new PreferenceService();

// Get user notifications
router.get('/user/:userId', async (req, res) => {
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
});

// Get user unread count
router.get('/user/:userId/unread', async (req, res) => {
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
router.post('/read/:notificationId', async (req, res) => {
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
router.post('/read-all/:userId', async (req, res) => {
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
router.get('/preferences/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const preferences = await preferenceService.getAllUserPreferences(userId);

        res.json({ success: true, preferences });
    } catch (error) {
        console.error('Error getting user preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to get user preferences' });
    }
});

// Update notification preference
router.post('/preferences/:userId/:eventType', async (req, res) => {
    try {
        const userId = req.params.userId;
        const eventType = req.params.eventType as NotificationEventType;
        const { enabled, channels } = req.body;

        await preferenceService.updatePreference({
            userId,
            eventType,
            enabled,
            channels: channels as NotificationType[],
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating preference:', error);
        res.status(500).json({ success: false, error: 'Failed to update preference' });
    }
});

// Send notification event
router.post('/send-event', async (req, res) => {
    try {
        const { eventType, category, targetUserIds, payload, metadata } = req.body;

        await notificationService.publishEvent({
            eventType,
            category,
            targetUserIds,
            payload,
            metadata,
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error sending notification event:', error);
        res.status(500).json({ success: false, error: 'Failed to send notification event' });
    }
});

export const notificationRoutes = router;
