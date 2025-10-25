'use client';

import { useEffect, useState } from 'react';
import { getSocket } from './useSocket';
import { Download, DownloadMetrics } from './types';

export function useDownloads() {
  const [queue, setQueue] = useState<Download[]>([]);
  const [done, setDone] = useState<Download[]>([]);
  const [metrics, setMetrics] = useState<DownloadMetrics>({
    downloading: 0,
    queued: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('all', (data: string) => {
      const parsed = JSON.parse(data);
      const queueData = parsed.queue || [];
      const doneData = parsed.done || [];
      setQueue(queueData);
      setDone(doneData);
      updateMetrics(queueData, doneData);
    });

    socket.on('added', (data: string) => {
      const download: Download = JSON.parse(data);
      setQueue((prev) => [...prev, download]);
    });

    socket.on('updated', (data: string) => {
      const download: Download = JSON.parse(data);
      setQueue((prev) =>
        prev.map((d) => (d.url === download.url ? download : d))
      );
    });

    socket.on('completed', (data: string) => {
      const download: Download = JSON.parse(data);
      setQueue((prev) => prev.filter((d) => d.url !== download.url));
      setDone((prev) => [download, ...prev]);
    });

    socket.on('canceled', (data: string) => {
      const url: string = JSON.parse(data);
      setQueue((prev) => prev.filter((d) => d.url !== url));
    });

    socket.on('cleared', (data: string) => {
      const url: string = JSON.parse(data);
      setDone((prev) => prev.filter((d) => d.url !== url));
    });

    return () => {
      socket.off('all');
      socket.off('added');
      socket.off('updated');
      socket.off('completed');
      socket.off('canceled');
      socket.off('cleared');
    };
  }, []);

  const updateMetrics = (queueData: Download[], doneData: Download[]) => {
    const downloading = queueData.filter((d) => d.status === 'downloading').length;
    const queued = queueData.filter((d) => d.status === 'pending').length;
    const completed = doneData.filter((d) => d.status === 'finished').length;
    const failed = doneData.filter((d) => d.status === 'error').length;

    setMetrics({ downloading, queued, completed, failed });
  };

  return { queue, done, metrics };
}
