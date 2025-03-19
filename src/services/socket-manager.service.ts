import { CorsOptions } from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';

interface UserConnection {
    socketId: string;
    userId: string;
    connectedAt: Date;
    metadata?: Record<string, any>;
}
interface SocketManagerOptions {
    cors: CorsOptions;
    maxConnectionsPerUser: number;
    debug: boolean;
}

export class SocketManager {
    private io: Server;
    private userConnections: Map<string, Set<UserConnection>> = new Map();
    private socketToUser: Map<string, string> = new Map();
    private notificationService: NotificationService;
    private maxConnectionsPerUser: number;
    private debug: boolean;

    constructor(server: http.Server, notificationService: NotificationService, options: Partial<SocketManagerOptions> = {}) {
        this.io = new Server(server, {
            cors: options.cors || {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });

        this.notificationService = notificationService;
        this.maxConnectionsPerUser = options.maxConnectionsPerUser || 1;
        this.debug = options.debug || false;

        this.setupSocketServer();
    }

    private log(...args: any[]): void {
        if (this.debug) {
            console.log(`[SocketManager]`, ...args);
        }
    }

    private setupSocketServer(): void {
        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });

        setInterval(() => this.cleanupStaleConnections(), 60000);
    }

    // Public Methods
    public getIO(): Server {
        return this.io;
    }

    public getUserConnections(userId: string): UserConnection[] {
        return Array.from(this.userConnections.get(userId) || []);
    }

    public getActiveConnectionsCount(): number {
        return this.socketToUser.size;
    }

    public getActiveUsersCount(): number {
        return this.userConnections.size;
    }

    public isUserConnected(userId: string): boolean {
        const connections = this.userConnections.get(userId);
        return !!connections && connections.size > 0;
    }

    public disconnectUser(userId: string, reason: string = 'server_disconnect'): void {
        const connections = this.userConnections.get(userId);
        if (!connections) return;

        for (const conn of connections) {
            const socket = this.io.sockets.sockets.get(conn.socketId);
            if (socket) {
                socket.emit('server_disconnect', { reason });
                socket.disconnect(true);
            }
        }

        this.userConnections.delete(userId);

        for (const [socketId, uid] of this.socketToUser.entries()) {
            if (uid === userId) {
                this.socketToUser.delete(socketId);
            }
        }

        this.log(`Disconnected all connections for user ${userId}. Reason: ${reason}`);
    }

    public sendToUser(userId: string, event: string, data: any): boolean {
        if (!this.isUserConnected(userId)) {
            return false;
        }

        this.io.to(`user:${userId}`).emit(event, data);
        return true;
    }

    public broadcastToAll(event: string, data: any, exceptUserId?: string): void {
        if (exceptUserId) {
            this.io.except(`user:${exceptUserId}`).emit(event, data);
        } else {
            this.io.emit(event, data);
        }
    }

    // Private Methods
    private handleConnection(socket: Socket): void {
        this.log(`New connection: ${socket.id}`);

        socket.on('authenticate', (userData: { userId: string; metadata?: Record<string, any> }) => {
            this.authenticateUser(socket, userData);
        });

        socket.on('disconnect', (reason: string) => {
            this.handleDisconnect(socket, reason);
        });

        socket.on('error', (error: Error) => {
            this.log(`Socket error (${socket.id}):`, error);
        });

        socket.on('joinRoom', (room) => {
            socket.join(room);

            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        const authTimeout = setTimeout(() => {
            if (!this.socketToUser.has(socket.id)) {
                this.log(`Authentication timeout for socket ${socket.id}`);
                socket.disconnect(true);
            }
        }, 30000);

        socket.on('disconnect', () => {
            clearTimeout(authTimeout);
        });
    }

    private authenticateUser(socket: Socket, userData: { userId: string; metadata?: Record<string, any> }): void {
        const { userId, metadata = {} } = userData;

        if (!userId) {
            this.log(`Authentication failed: No user ID provided`);
            socket.emit('unauthorized', { message: 'User ID is required' });
            socket.disconnect(true);

            return;
        }

        const userConnection: UserConnection = {
            socketId: socket.id,
            userId,
            connectedAt: new Date(),
            metadata,
        };

        const existingConnection = this.isDuplicateConnection(userId, socket.id);

        if (existingConnection) {
            this.log(`Duplicate connection detected for user ${userId}`);
            // Disconnect the new one or keep both???
        }

        if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
        }

        this.userConnections.get(userId)?.add(userConnection);
        this.socketToUser.set(socket.id, userId);

        socket.join(`user:${userId}`);

        const connectionsCount = this.userConnections.get(userId)?.size || 0;

        this.log(`User ${userId} authenticated on socket ${socket.id}`);
        this.log(`User ${userId} has ${connectionsCount} active connections`);

        if (this.maxConnectionsPerUser > 0 && connectionsCount > this.maxConnectionsPerUser) {
            this.enforceConnectionLimit(userId);
        }

        socket.emit('authenticated', {
            success: true,
            connectionCount: this.userConnections.get(userId)?.size || 1,
        });

        // Send any pending notifications
        this.sendPendingNotifications(userId);
    }

    private handleDisconnect(socket: Socket, reason: string): void {
        const userId = this.socketToUser.get(socket.id);
        this.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);

        if (userId) {
            this.socketToUser.delete(socket.id);

            const userConnections = this.userConnections.get(userId);

            if (userConnections) {
                for (const conn of userConnections) {
                    if (conn.socketId === socket.id) {
                        userConnections.delete(conn);
                        break;
                    }
                }

                if (userConnections.size === 0) {
                    this.userConnections.delete(userId);
                    this.log(`User ${userId} has no more active connections`);
                } else {
                    this.log(`User ${userId} still has ${userConnections.size} active connections`);
                }
            }
        }
    }

    private isDuplicateConnection(userId: string, socketId: string): boolean {
        const userConnections = this.userConnections.get(userId);
        if (!userConnections) return false;

        return userConnections.size > 0;
    }

    private cleanupStaleConnections(): void {
        const now = new Date().getTime();
        const staleThreshold = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

        for (const [userId, connections] of this.userConnections.entries()) {
            const staleConnections: UserConnection[] = [];

            for (const conn of connections) {
                const connectionAge = now - conn.connectedAt.getTime();
                if (connectionAge > staleThreshold) {
                    staleConnections.push(conn);
                }
            }

            for (const conn of staleConnections) {
                this.log(`Cleaning up stale connection ${conn.socketId} for user ${userId}`);

                const socket = this.io.sockets.sockets.get(conn.socketId);
                if (socket) {
                    socket.disconnect(true);
                }

                connections.delete(conn);
                this.socketToUser.delete(conn.socketId);
            }

            if (connections.size === 0) {
                this.userConnections.delete(userId);
            }
        }

        this.log(`Cleanup complete. Active users: ${this.userConnections.size}, Active sockets: ${this.socketToUser.size}`);
    }

    private enforceConnectionLimit(userId: string): void {
        const connections = this.userConnections.get(userId);
        if (!connections || connections.size <= this.maxConnectionsPerUser) return;

        const sortedConnections = Array.from(connections).sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime());

        const connectionsToRemove = sortedConnections.slice(0, sortedConnections.length - this.maxConnectionsPerUser);

        for (const conn of connectionsToRemove) {
            this.log(`Enforcing connection limit: Disconnecting socket ${conn.socketId} for user ${userId}`);

            const socket = this.io.sockets.sockets.get(conn.socketId);
            if (socket) {
                socket.emit('connection_limit', {
                    message: 'You have exceeded the maximum number of concurrent connections',
                });
                socket.disconnect(true);
            }

            connections.delete(conn);
            this.socketToUser.delete(conn.socketId);
        }
    }

    private async sendPendingNotifications(userId: string): Promise<void> {
        try {
            const notifications = await this.notificationService.getUserNotifications(userId, {
                limit: 10,
                unreadOnly: true,
            });

            if (notifications.length > 0) {
                this.log(`Sending ${notifications.length} pending notifications to user ${userId}`);

                this.io.to(`user:${userId}`).emit('pending_notifications', notifications);
            }
        } catch (error) {
            this.log(`Error sending pending notifications to user ${userId}:`, error);
        }
    }
}
