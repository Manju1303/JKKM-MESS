import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  // Reconnect automatically if the backend container restarts
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,       // Wait 2s before first retry
  reconnectionDelayMax: 10000,   // Cap at 10s between retries
  timeout: 10000,
});
