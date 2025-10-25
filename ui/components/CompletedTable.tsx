'use client';

import { Download } from '@/lib/types';
import { CheckCircle, XCircle, Trash2, ExternalLink, FolderOpen, Trash } from 'lucide-react';
import { showToast } from './Toast';

interface Props {
  downloads: Download[];
  onUpdate?: () => void;
}

export function CompletedTable({ downloads, onUpdate }: Props) {

  const handleDelete = async (url: string) => {
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: 'done', ids: [url] }),
      });
      
      if (response.ok) {
        showToast('Download removed successfully', 'success');
        onUpdate?.();
      } else {
        showToast('Failed to remove download', 'error');
      }
    } catch (error) {
      showToast('Error removing download', 'error');
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all completed downloads?')) {
      try {
        const allIds = downloads.map(d => d.url);
        const response = await fetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ where: 'done', ids: allIds }),
        });
        
        if (response.ok) {
          showToast(`Cleared ${allIds.length} downloads`, 'success');
          onUpdate?.();
        } else {
          showToast('Failed to clear downloads', 'error');
        }
      } catch (error) {
        showToast('Error clearing downloads', 'error');
      }
    }
  };

  const formatSize = (size?: number) => {
    if (!size) return '';
    if (size > 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
    if (size > 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${size} B`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp / 1000000); // Convert from nanoseconds
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (downloads.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 rounded-3xl shadow-xl p-12 text-center border border-gray-200/50 dark:border-gray-700/50">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900 dark:to-emerald-800 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No completed downloads yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleClearAll}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors duration-200"
          title="Clear all completed downloads"
        >
          <Trash className="w-4 h-4" />
          Clear All
        </button>
      </div>
      {downloads.map((download) => (
        <div
          key={download.url}
          className={`backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${download.status === 'finished'
            ? 'bg-green-50/70 dark:bg-green-900/20 border-green-200/50 dark:border-green-700/50 hover:bg-green-100/70 dark:hover:bg-green-900/30'
            : 'bg-red-50/70 dark:bg-red-900/20 border-red-200/50 dark:border-red-700/50 hover:bg-red-100/70 dark:hover:bg-red-900/30'
            }`}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Thumbnail placeholder */}
            <div className="relative">
              <div className={`p-2 sm:p-3 rounded-xl ${download.status === 'finished'
                ? 'bg-green-100 dark:bg-green-900/50'
                : 'bg-red-100 dark:bg-red-900/50'
                }`}>
                {download.status === 'finished' ? (
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              {download.status === 'finished' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                {download.entry?.filename ? (
                  <a
                    href={`http://localhost:8081/download/${download.entry.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {download.entry?.originalTitle || download.title}
                  </a>
                ) : (
                  <span>{download.entry?.originalTitle || download.title}</span>
                )}
              </h3>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {download.size && (
                    <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-xs">
                      💾 {formatSize(download.size)}
                    </span>
                  )}
                  {download.entry?.filename && (
                    <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full text-blue-700 dark:text-blue-300 text-xs font-medium">
                      📄 {download.entry.filename.split('.').pop()?.toUpperCase()}
                    </span>
                  )}
                  {download.timestamp && (
                    <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full text-purple-700 dark:text-purple-300 text-xs">
                      🕒 {formatDate(download.timestamp)}
                    </span>
                  )}
                </div>
                {download.msg && (
                  <div className="text-xs italic text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border-l-2 border-amber-400">
                    ⚠️ {download.msg}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex gap-1">
                {download.entry?.filename && (
                  <button
                    onClick={() => {
                      const formatFilename = (filename: string) => {
                        return filename
                          .replace(/\[.*?\]/g, '')
                          .replace(/\.webm$/, '.mp4')
                          .toLowerCase()
                          .replace(/[^a-z0-9\s.-]/g, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '')
                          .replace(/-+\./g, '.');
                      };

                      fetch('/api/open-folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: formatFilename(download.entry!.filename) })
                      }).then(response => {
                        if (response.ok) {
                          showToast('Folder opened', 'success');
                        } else {
                          showToast('Failed to open folder', 'error');
                        }
                      }).catch(() => {
                        showToast('Error opening folder', 'error');
                      });
                    }}
                    className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 transition-all duration-200 hover:scale-110 hover:shadow-md"
                    title="Open folder"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                )}
                <a
                  href={download.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-all duration-200 hover:scale-110 hover:shadow-md"
                  title="Open source URL"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(download.url)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 hover:shadow-md"
                  title="Delete from list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {download.status === 'finished' && (
                <div className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Completed
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
