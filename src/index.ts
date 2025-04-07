import axios from 'axios';
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
import { SocketManager } from './services/socket-manager.service';
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors(corsOptions));
app.use(express.json());
initializeProviders();

app.get('/self', (_: express.Request, res: express.Response) => {
    console.log('Self route called');
    res.send('Self call succeeded!');
});

app.use('/api/notifications', notificationRoutes);

const socketManager = new SocketManager(server, {
    cors: corsOptions,
    debug: true,
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

    // Schedule periodic self-calls every 30 minutes to avoid render server shutting down
    setInterval(async () => {
        try {
            await axios.get(`${process.env.ORIGIN_URL}/self`);
        } catch (error: unknown) {
            console.error('Self call failed:', error instanceof Error ? error.message : 'Unknown error');
        }
    }, 10 * 60 * 1000);
});

export { io, socketManager };
