'use client';

import { Download } from '@/lib/types';
import { Trash2, ExternalLink, Download as DownloadIcon } from 'lucide-react';
import { showToast } from './Toast';

interface Props {
  downloads: Download[];
}

export function DownloadTable({ downloads }: Props) {
  const handleDelete = async (url: string) => {
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: 'queue', ids: [url] }),
      });
      
      if (response.ok) {
        showToast('Download cancelled', 'success');
      } else {
        showToast('Failed to cancel download', 'error');
      }
    } catch (error) {
      showToast('Error cancelling download', 'error');
    }
  };

  const formatSpeed = (speed?: number) => {
    if (!speed) return '';
    if (speed > 1024 * 1024) return `${(speed / 1024 / 1024).toFixed(1)} MB/s`;
    if (speed > 1024) return `${(speed / 1024).toFixed(1)} KB/s`;
    return `${speed.toFixed(0)} B/s`;
  };

  const formatEta = (eta?: number) => {
    if (!eta) return '';
    const minutes = Math.floor(eta / 60);
    const seconds = eta % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (downloads.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 rounded-3xl shadow-xl p-12 text-center border border-gray-200/50 dark:border-gray-700/50">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
          <DownloadIcon className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No downloads in progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {downloads.map((download) => (
        <div
          key={download.url}
          className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-lg p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {download.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  📈 {formatSpeed(download.speed)}
                </span>
                <span className="flex items-center gap-1">
                  ⏱️ {formatEta(download.eta)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(download.url)}
                className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-all duration-300 hover:scale-110"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <a
                href={download.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-all duration-300 hover:scale-110"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {download.percent?.toFixed(0) || 0}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {download.status === 'preparing' ? 'Preparing...' : 'Downloading'}
              </span>
            </div>
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${download.percent || 0}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
