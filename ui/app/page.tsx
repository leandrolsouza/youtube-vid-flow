'use client';

import { useState } from 'react';
import { Download, CheckCircle, XCircle, Clock, Play, Pause, Trash2, FolderOpen, Settings, TrendingUp } from 'lucide-react';
import { DownloadForm } from '@/components/DownloadForm';
import { DownloadTable } from '@/components/DownloadTable';
import { CompletedTable } from '@/components/CompletedTable';
import { ThemeToggle } from '@/components/ThemeToggle';
import { VersionInfo } from '@/components/VersionInfo';
import { ToastContainer } from '@/components/Toast';
import { useSocket } from '@/lib/useSocket';
import { useDownloads } from '@/lib/useDownloads';

export default function Home() {
  const { connected } = useSocket();
  const { queue, done, metrics } = useDownloads();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  
  const handleUpdate = async () => {
    // Force refresh by fetching latest data
    try {
      await fetch('/api/history');
    } catch (e) {
      console.error('Failed to refresh data:', e);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-20 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-6 gap-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
          <Download className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
          <button 
            onClick={() => setActiveTab('active')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'active' 
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50' 
                : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'completed' 
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50' 
                : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-2">
          <ThemeToggle />
          <VersionInfo />
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-20 min-h-screen">
        {/* Header Stats */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">VidFlow</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Manage your downloads</p>
              </div>
              {!connected && (
                <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-yellow-600 dark:text-yellow-500 text-sm">Connecting...</span>
                </div>
              )}
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">Downloading</span>
                  <Download className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-blue-500 dark:text-blue-400">{metrics.downloading}</p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">Queued</span>
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{metrics.queued}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">Completed</span>
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{metrics.completed}</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">Failed</span>
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{metrics.failed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          <DownloadForm />
          
          <div className="mt-8">
            {activeTab === 'active' ? (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  Active Downloads
                </h2>
                <DownloadTable downloads={queue} />
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                  Completed Downloads
                </h2>
                <CompletedTable downloads={done} onUpdate={handleUpdate} />
              </div>
            )}
          </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
