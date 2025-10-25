import { PersistentQueue } from './PersistentQueue.js';
import { Download } from './Download.js';
import { DownloadInfo } from './DownloadInfo.js';
import { AUDIO_FORMATS } from './formats.js';
import { join, resolve } from 'path';
import { existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';
import { logger } from '../logger.js';
import { spawnYtdlp } from '../utils/ytdlp.js';

export class DownloadQueue {
  constructor(config, notifier) {
    this.config = config;
    this.notifier = notifier;
    this.queue = new PersistentQueue(join(config.STATE_DIR, 'queue'));
    this.done = new PersistentQueue(join(config.STATE_DIR, 'completed'));
    this.pending = new PersistentQueue(join(config.STATE_DIR, 'pending'));
    this.semaphore = null;
    this.seqLock = null;

    if (config.DOWNLOAD_MODE === 'sequential') {
      this.seqLock = { locked: false, queue: [] };
    } else if (config.DOWNLOAD_MODE === 'limited') {
      this.semaphore = { max: parseInt(config.MAX_CONCURRENT_DOWNLOADS), current: 0, queue: [] };
    }
  }

  async initialize() {
    logger.info('Initializing DownloadQueue');
    await this.done.load();
    await this.importQueue();
    await this.importPending();
  }

  async importQueue() {
    for (const [, item] of this.queue.savedItems()) {
      await this.addDownload(item, true);
    }
  }

  async importPending() {
    for (const [, item] of this.pending.savedItems()) {
      await this.addDownload(item, false);
    }
  }

  async startDownload(download) {
    if (download.canceled) return;

    if (this.config.DOWNLOAD_MODE === 'sequential') {
      await this.sequentialDownload(download);
    } else if (this.config.DOWNLOAD_MODE === 'limited' && this.semaphore) {
      await this.limitedDownload(download);
    } else {
      this.runDownload(download);
    }
  }

  async sequentialDownload(download) {
    const acquire = () => {
      return new Promise((resolve) => {
        if (!this.seqLock.locked) {
          this.seqLock.locked = true;
          resolve();
        } else {
          this.seqLock.queue.push(resolve);
        }
      });
    };

    const release = () => {
      if (this.seqLock.queue.length > 0) {
        const next = this.seqLock.queue.shift();
        next();
      } else {
        this.seqLock.locked = false;
      }
    };

    await acquire();
    try {
      await this.runDownload(download);
    } finally {
      release();
    }
  }

  async limitedDownload(download) {
    const acquire = () => {
      return new Promise((resolve, reject) => {
        try {
          if (this.semaphore.current < this.semaphore.max) {
            this.semaphore.current++;
            resolve();
          } else {
            this.semaphore.queue.push(resolve);
          }
        } catch (e) {
          reject(new Error(`Semaphore acquire failed: ${e.message}`));
        }
      });
    };

    const release = () => {
      if (this.semaphore.queue.length > 0) {
        const next = this.semaphore.queue.shift();
        next();
      } else {
        this.semaphore.current--;
      }
    };

    await acquire();
    try {
      await this.runDownload(download);
    } finally {
      release();
    }
  }

  async runDownload(download) {
    if (download.canceled) return;
    try {
      await download.start(this.notifier);
    } catch (e) {
      logger.error(`Download failed: ${e.message}`);
      download.info.status = 'error';
      download.info.msg = e.message;
    } finally {
      await this.postDownloadCleanup(download);
    }
  }

  async postDownloadCleanup(download) {
    if (download.info.status !== 'finished') {
      if (download.tmpfilename && existsSync(download.tmpfilename)) {
        try {
          unlinkSync(download.tmpfilename);
        } catch (e) {
          logger.error(`Failed to delete temp file: ${e.message}`);
        }
      }
      download.info.status = 'error';
    }
    download.close();

    if (this.queue.exists(download.info.url)) {
      await this.queue.delete(download.info.url);
      if (download.canceled) {
        await this.notifier.canceled(download.info.url);
      } else {
        await this.done.put(download);
        await this.notifier.completed(download.info);
      }
    }
  }

  async extractInfo(url, playlistStrictMode) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--flat-playlist',
        '--no-color',
        url
      ];

      if (playlistStrictMode) {
        args.push('--no-playlist');
      }

      const proc = spawnYtdlp(args);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(error || 'Failed to extract info'));
        } else {
          try {
            const lines = output.trim().split('\n').filter(l => l);
            const info = JSON.parse(lines[lines.length - 1]);
            resolve(info);
          } catch (e) {
            reject(new Error(`Failed to parse yt-dlp output: ${e.message}`));
          }
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
      });
    });
  }

  calcDownloadPath(quality, format, folder) {
    const baseDir = (quality === 'audio' || AUDIO_FORMATS.includes(format))
      ? this.config.AUDIO_DOWNLOAD_DIR
      : this.config.DOWNLOAD_DIR;

    if (folder) {
      if (!this.config.CUSTOM_DIRS) {
        return [null, { status: 'error', msg: 'CUSTOM_DIRS is not enabled' }];
      }

      if (folder.includes('..') || folder.includes('~') || /[\/\\]/.test(folder.charAt(0))) {
        return [null, { status: 'error', msg: 'Invalid folder path' }];
      }

      const dlDir = resolve(join(baseDir, folder));
      const realBase = resolve(baseDir);

      if (!dlDir.startsWith(realBase + require('path').sep)) {
        return [null, { status: 'error', msg: 'Folder must be inside base directory' }];
      }

      if (!existsSync(dlDir)) {
        if (!this.config.CREATE_CUSTOM_DIRS) {
          return [null, { status: 'error', msg: 'CREATE_CUSTOM_DIRS is not enabled' }];
        }
        try {
          mkdirSync(dlDir, { recursive: true });
        } catch (e) {
          return [null, { status: 'error', msg: `Failed to create directory: ${e.message}` }];
        }
      }

      return [dlDir, null];
    }

    return [baseDir, null];
  }

  async addDownload(dl, autoStart) {
    const [dlDir, error] = this.calcDownloadPath(dl.quality, dl.format, dl.folder);
    if (error) return error;

    const entry = dl.entry;
    
    // Normaliza o título para o nome do arquivo
    const normalizedTitle = this.normalizeTitle(entry.title || dl.title);
    
    let output = dl.custom_name_prefix
      ? `${dl.custom_name_prefix}.${normalizedTitle}.%(ext)s`
      : `${normalizedTitle}.%(ext)s`;
    if (entry?.playlist) {
      if (this.config.OUTPUT_TEMPLATE_PLAYLIST) {
        output = this.config.OUTPUT_TEMPLATE_PLAYLIST;
      }
      for (const [key, value] of Object.entries(entry)) {
        if (key.startsWith('playlist')) {
          output = output.replace(`%(${key})s`, String(value));
        }
      }
    }

    const ytdlOpts = { ...this.config.YTDL_OPTIONS };
    if (dl.playlist_item_limit > 0) {
      ytdlOpts.playlistend = dl.playlist_item_limit;
    }

    const download = new Download(
      dlDir,
      this.config.TEMP_DIR,
      output,
      this.config.OUTPUT_TEMPLATE_CHAPTER,
      dl.quality,
      dl.format,
      ytdlOpts,
      dl
    );

    if (autoStart) {
      await this.queue.put(download);
      this.startDownload(download);
    } else {
      await this.pending.put(download);
    }

    await this.notifier.added(dl);
    return { status: 'ok' };
  }

  normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, '') // Remove hífens do início e fim
      .substring(0, 100); // Limita a 100 caracteres
  }

  async addEntry(entry, quality, format, folder, customNamePrefix, playlistStrictMode, playlistItemLimit, autoStart, already) {
    if (!entry) {
      return { status: 'error', msg: 'Invalid/empty data' };
    }

    let error = null;
    if (entry.live_status === 'is_upcoming' && entry.release_timestamp) {
      const dt = new Date(entry.release_timestamp * 1000);
      error = `Live stream scheduled for ${dt.toISOString()}`;
    } else if (entry.msg) {
      error = entry.msg;
    }

    const etype = entry._type || 'video';

    if (etype.startsWith('url')) {
      return await this.add(entry.url, quality, format, folder, customNamePrefix, playlistStrictMode, playlistItemLimit, autoStart, already);
    }

    if (etype === 'playlist') {
      const entries = entry.entries || [];
      const limit = playlistItemLimit > 0 ? playlistItemLimit : entries.length;
      const totalToProcess = Math.min(limit, entries.length);
      
      logger.info(`Playlist detected with ${entries.length} entries, processing ${totalToProcess}`);
      
      const results = [];
      
      for (let i = 0; i < totalToProcess; i++) {
        const etr = entries[i];
        etr._type = 'video';
        etr.playlist = entry.id;
        etr.playlist_index = String(i + 1).padStart(String(entries.length).length, '0');
        
        for (const prop of ['id', 'title', 'uploader', 'uploader_id']) {
          if (entry[prop]) {
            etr[`playlist_${prop}`] = entry[prop];
          }
        }
        
        results.push(await this.addEntry(etr, quality, format, folder, customNamePrefix, playlistStrictMode, playlistItemLimit, autoStart, already));
      }
      
      const errors = results.filter(r => r.status === 'error');
      if (errors.length > 0) {
        return { status: 'error', msg: errors.map(e => e.msg).join(', ') };
      }
      return { status: 'ok' };
    }

    if (etype === 'video' || (etype.startsWith('url') && entry.id && entry.title)) {
      const key = entry.webpage_url || entry.url;
      if (!this.queue.exists(key)) {
        // Salva o título original no entry
        entry.originalTitle = entry.title;
        
        const dl = new DownloadInfo(
          entry.id,
          entry.title || entry.id,
          key,
          quality,
          format,
          folder,
          customNamePrefix,
          error,
          entry,
          playlistItemLimit
        );
        await this.addDownload(dl, autoStart);
      }
      return { status: 'ok' };
    }

    return { status: 'error', msg: `Unsupported resource type "${etype}"` };
  }

  async add(url, quality, format, folder, customNamePrefix, playlistStrictMode, playlistItemLimit, autoStart = true, already = null) {
    logger.info(`Adding ${url}: quality=${quality} format=${format} folder=${folder}`);
    
    already = already || new Set();
    if (already.has(url)) {
      logger.info('Recursion detected, skipping');
      return { status: 'ok' };
    }
    already.add(url);

    try {
      const entry = await this.extractInfo(url, playlistStrictMode);
      return await this.addEntry(entry, quality, format, folder, customNamePrefix, playlistStrictMode, playlistItemLimit, autoStart, already);
    } catch (e) {
      return { status: 'error', msg: e.message };
    }
  }

  async startPending(ids) {
    for (const id of ids) {
      if (!this.pending.exists(id)) {
        logger.warn(`Requested start for non-existent download ${id}`);
        continue;
      }
      try {
        const dl = this.pending.get(id);
        await this.queue.put(dl);
        await this.pending.delete(id);
        this.startDownload(dl);
      } catch (e) {
        logger.error(`Failed to start pending download ${id}: ${e.message}`);
      }
    }
    return { status: 'ok' };
  }

  async cancel(ids) {
    for (const id of ids) {
      try {
        if (this.pending.exists(id)) {
          await this.pending.delete(id);
          await this.notifier.canceled(id);
          continue;
        }
        if (!this.queue.exists(id)) {
          logger.warn(`Requested cancel for non-existent download ${id}`);
          continue;
        }
        const dl = this.queue.get(id);
        if (dl.started()) {
          dl.cancel();
        } else {
          await this.queue.delete(id);
          await this.notifier.canceled(id);
        }
      } catch (e) {
        logger.error(`Failed to cancel download ${id}: ${e.message}`);
      }
    }
    return { status: 'ok' };
  }

  async clear(ids) {
    for (const id of ids) {
      if (!this.done.exists(id)) {
        logger.warn(`Requested delete for non-existent download ${id}`);
        continue;
      }
      
      if (this.config.DELETE_FILE_ON_TRASHCAN) {
        const dl = this.done.get(id);
        try {
          const [dlDir] = this.calcDownloadPath(dl.info.quality, dl.info.format, dl.info.folder);
          const filePath = join(dlDir, dl.info.filename);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        } catch (e) {
          logger.warn(`Failed to delete file for download ${id}: ${e.message}`);
        }
      }
      
      await this.done.delete(id);
      await this.notifier.cleared(id);
    }
    return { status: 'ok' };
  }

  get() {
    const queue = [...this.queue.items(), ...this.pending.items()].map(([key, value]) => [key, value.info]);
    const done = this.done.items().map(([key, value]) => [key, value.info]);
    return [queue, done];
  }
}
