'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:8081', {
        path: '/socket.io',
      });

      socket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  return { socket, connected };
}

export function getSocket() {
  return socket;
}
