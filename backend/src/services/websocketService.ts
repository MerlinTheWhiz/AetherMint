import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { INotification } from '../models/Notification';

// Define the shape of the notification data that will be sent to the client
interface ClientNotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'course' | 'message' | 'system' | 'achievement';
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  timestamp: Date;
}

interface UserSockets {
  [userId: string]: Socket[];
}

class WebsocketService {
  private io: Server;
  private userSockets: UserSockets = {};

  constructor(server?: any) {
    if (server) {
      this.io = new Server(server, {
        cors: {
          origin: process.env.FRONTEND_URL || '*',
          methods: ['GET', 'POST'],
          credentials: true
        }
      });
    } else {
      // For testing purposes
      const httpServer = createServer();
      this.io = new Server(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || '*',
          methods: ['GET', 'POST'],
          credentials: true
        }
      });
    }

    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('register-user', (userId: string) => {
        this.addUserSocket(userId, socket);
        console.log(`User ${userId} registered with socket ${socket.id}`);
      });

      socket.on('disconnect', () => {
        this.removeSocket(socket);
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  private addUserSocket(userId: string, socket: Socket): void {
    if (!this.userSockets[userId]) {
      this.userSockets[userId] = [];
    }

    // Remove any existing sockets for this user that might be stale
    this.userSockets[userId] = this.userSockets[userId].filter(s => s.connected);
    this.userSockets[userId].push(socket);

    // Set up cleanup when socket disconnects
    socket.once('disconnect', () => {
      this.removeUserSocket(userId, socket);
    });
  }

  private removeUserSocket(userId: string, socket: Socket): void {
    if (this.userSockets[userId]) {
      this.userSockets[userId] = this.userSockets[userId].filter(s => s.id !== socket.id);
      
      // Clean up empty arrays
      if (this.userSockets[userId].length === 0) {
        delete this.userSockets[userId];
      }
    }
  }

  private removeSocket(socket: Socket): void {
    // Find and remove this socket from all user arrays
    Object.keys(this.userSockets).forEach(userId => {
      this.userSockets[userId] = this.userSockets[userId].filter(s => s.id !== socket.id);
      
      if (this.userSockets[userId].length === 0) {
        delete this.userSockets[userId];
      }
    });
  }

  public sendNotification(userId: string, notification: INotification): void {
    const userSockets = this.userSockets[userId];

    if (userSockets && userSockets.length > 0) {
      // Filter out disconnected sockets
      const connectedSockets = userSockets.filter(socket => socket.connected);

      if (connectedSockets.length > 0) {
        // Send notification to all connected sockets for this user
        connectedSockets.forEach(socket => {
          socket.emit('new-notification', {
            id: notification._id.toString(),
            userId: notification.userId,
            title: notification.title,
            message: notification.message,
            category: notification.category,
            isRead: notification.isRead,
            priority: notification.priority,
            actionUrl: notification.actionUrl,
            timestamp: notification.createdAt,
          });
        });

        console.log(`Notification sent via websocket to user ${userId}`);
      } else {
        // Clean up empty socket array
        delete this.userSockets[userId];
      }
    } else {
      console.log(`No connected sockets found for user ${userId}`);
    }
  }

  public broadcastToAll(data: any, event: string): void {
    this.io.emit(event, data);
  }

  public getConnectedUsers(): string[] {
    return Object.keys(this.userSockets);
  }

  public getUserSocketCount(userId: string): number {
    return this.userSockets[userId] ? this.userSockets[userId].length : 0;
  }

  public getIO(): Server {
    return this.io;
  }
}

// Create a singleton instance
let websocketService: WebsocketService;

export const initWebsocketService = (server?: any): WebsocketService => {
  if (!websocketService) {
    websocketService = new WebsocketService(server);
  }
  return websocketService;
};

export const getWebsocketService = (): WebsocketService => {
  if (!websocketService) {
    throw new Error('Websocket service not initialized. Call initWebsocketService first.');
  }
  return websocketService;
};