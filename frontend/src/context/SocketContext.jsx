import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const lastSeenRef = useRef({});
  const [lastSeenMap, setLastSeenMap] = useState({});

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('get_online_users');
    });

    newSocket.on('online_users', (users) => {
      setOnlineUsers(new Set(users));
    });

    newSocket.on('users_last_seen', (data) => {
      lastSeenRef.current = { ...lastSeenRef.current, ...data };
      setLastSeenMap((prev) => ({ ...prev, ...data }));
    });

    newSocket.on('user_online', ({ user_id }) => {
      setOnlineUsers((prev) => new Set([...prev, user_id]));
    });

    newSocket.on('user_offline', ({ user_id, last_seen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(user_id);
        return next;
      });
      if (last_seen) {
        lastSeenRef.current[user_id] = last_seen;
        setLastSeenMap((prev) => ({ ...prev, [user_id]: last_seen }));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, lastSeenMap }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
