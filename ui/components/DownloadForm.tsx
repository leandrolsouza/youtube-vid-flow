'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { showToast } from './Toast';

export function DownloadForm() {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('best');
  const [format, setFormat] = useState('mp4');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    try {
      const response = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          quality,
          format,
          folder: '',
          custom_name_prefix: '',
          playlist_strict_mode: false,
          playlist_item_limit: 0,
          auto_start: true,
        }),
      });

      const result = await response.json();
      if (result.status === 'ok') {
        setUrl('');
        showToast('Download added successfully', 'success');
      } else {
        showToast(result.msg || 'Failed to add download', 'error');
      }
    } catch (error) {
      showToast('Failed to add download', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste video URL or playlist..."
          className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Download className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
          disabled={loading}
        >
          <option value="best">Best Quality</option>
          <option value="1080">1080p HD</option>
          <option value="720">720p HD</option>
          <option value="480">480p SD</option>
          <option value="audio">Audio Only</option>
        </select>

        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
          disabled={loading}
        >
          <option value="mp4">MP4 Video</option>
          <option value="mp3">MP3 Audio</option>
          <option value="m4a">M4A Audio</option>
          <option value="opus">Opus Audio</option>
          <option value="any">Any Format</option>
        </select>
      </div>
    </form>
  );
}
