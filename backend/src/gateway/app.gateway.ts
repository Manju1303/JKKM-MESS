import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * AppGateway provides real-time WebSocket communication for:
 * - Live inventory alerts (low stock, expiry)
 * - Purchase approval notifications
 * - Kitchen issue updates
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!authHeader) {
        this.logger.warn(`Disconnecting unauthenticated WS client: ${client.id}`);
        client.disconnect();
        return;
      }
      const token = authHeader.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      client.data = { user: payload };
      this.connectedClients.set(client.id, client);
      this.logger.log(`Client connected: ${client.id} (User: ${payload.email}) | Total: ${this.connectedClients.size}`);
      client.emit('connected', { message: 'Connected to JKKM Mess ERP', clientId: client.id });
    } catch (err) {
      this.logger.warn(`Invalid JWT on WS connect, disconnecting ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} | Total: ${this.connectedClients.size}`);
  }

  /** Join a specific room (e.g., by role) */
  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string) {
    const user = client.data?.user;
    if (!user) {
      this.logger.warn(`Unauthenticated client ${client.id} tried to join room ${room}`);
      client.disconnect();
      return { event: 'error', message: 'Unauthorized' };
    }
    // Restrict 'managers' room to 'Super Admin' or 'Mess Manager'
    if (room === 'managers' && !['Super Admin', 'Mess Manager'].includes(user.role)) {
      this.logger.warn(`User ${user.email} with role ${user.role} unauthorized to join room ${room}`);
      return { event: 'error', message: 'Unauthorized' };
    }
    client.join(room);
    this.logger.log(`Client ${client.id} (User: ${user.email}, Role: ${user.role}) joined room: ${room}`);
    return { event: 'joined', room };
  }

  // ─── Broadcast methods called by services ───────────────────────────

  /** Broadcast low stock alert to all connected clients */
  emitLowStockAlert(data: { productId: number; productName: string; currentQty: number; minLevel: number }) {
    this.server.emit('low-stock-alert', {
      ...data,
      timestamp: new Date().toISOString(),
      severity: data.currentQty === 0 ? 'CRITICAL' : 'WARNING',
    });
  }

  /** Broadcast new purchase order to managers */
  emitNewPurchase(data: { purchaseId: number; purchaseNumber: string; supplierId: number; amount: number }) {
    this.server.to('managers').emit('new-purchase', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Broadcast kitchen issue event */
  emitKitchenIssue(data: { productName: string; quantity: number; meal: string }) {
    this.server.emit('kitchen-issue', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Broadcast expiry alert */
  emitExpiryAlert(data: { productName: string; daysToExpiry: number; quantity: number }) {
    this.server.emit('expiry-alert', {
      ...data,
      timestamp: new Date().toISOString(),
      severity: data.daysToExpiry <= 2 ? 'CRITICAL' : 'WARNING',
    });
  }

  /** Broadcast general notification */
  emitNotification(data: { title: string; message: string; type: string; severity: string }) {
    this.server.emit('notification', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Get current connected client count */
  getConnectedCount() {
    return this.connectedClients.size;
  }
}
