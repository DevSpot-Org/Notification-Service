import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import 'module-alias/register';
import { errorHandler } from './core';
import { corsOptions, supabase } from './core/config';
import { initializeProviders } from './providers';
import { NotificationRepository } from './repositories/notification-repository';
import { notificationRoutes } from './routes/notification-routes';
import { NotificationService } from './services/notification.service';
import { SocketManager } from './services/socket-manager.service';
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors(corsOptions));
app.use(express.json());
initializeProviders();

app.use('/api/notifications', notificationRoutes);

const notificationService = NotificationService.getInstance();

const socketManager = new SocketManager(server, notificationService, {
    cors: corsOptions,
    debug: false,
});

const io = socketManager.getIO();

NotificationRepository.setupNotificationSubscription(supabase, io);

app.get('/health', (_, res) => {
    const stats = {
        status: 'ok',
        activeUsers: socketManager.getActiveUsersCount(),
        activeConnections: socketManager.getActiveConnectionsCount(),
        uptime: process.uptime(),
    };
    res.json(stats);
});

// Error handling middleware should be last
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    errorHandler.handle(err, req, res, next).catch(next);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { io, socketManager };
