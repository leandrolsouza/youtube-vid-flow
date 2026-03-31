import express from 'express';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { config } from './config.js';
import { logger } from './logger.js';

function formatFilename(filename) {
  return filename
    .replace(/\[.*?\]/g, '') // Remove [videoId]
    .replace(/\.webm$/, '.mp4') // Change extension
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, '') // Keep only letters, numbers, spaces, hyphens, dots
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .replace(/-+\./g, '.'); // Remove hyphens before extension
}

export function createRoutes(dqueue, io) {
  const router = express.Router();

  const csrfCheck = (req, res, next) => {
    const origin = req.headers.origin || req.headers.referer;
    if (!origin) {
      return next();
    }
    const allowedOrigins = [
      `http://localhost:3000`,
      `http://127.0.0.1:3000`,
      `http://localhost:${config.PORT}`,
      `http://127.0.0.1:${config.PORT}`
    ];
    const originUrl = new URL(origin);
    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.includes(req.headers.host);
    if (!isAllowed) {
      return res.status(403).json({ status: 'error', msg: 'CSRF check failed' });
    }
    next();
  };

  router.post(`${config.URL_PREFIX}add`, csrfCheck, async (req, res) => {
    logger.info('Received request to add download');
    const { url, quality, format, folder, custom_name_prefix, playlist_strict_mode, playlist_item_limit, auto_start } = req.body;

    if (!url || !quality) {
      return res.status(400).json({ status: 'error', msg: 'Missing url or quality' });
    }

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ status: 'error', msg: 'Invalid URL format' });
    }

    const customNamePrefix = custom_name_prefix || '';
    const autoStart = auto_start !== undefined ? auto_start : true;
    const playlistStrictMode = playlist_strict_mode !== undefined ? playlist_strict_mode : config.DEFAULT_OPTION_PLAYLIST_STRICT_MODE;
    const playlistItemLimit = playlist_item_limit !== undefined ? parseInt(playlist_item_limit) : parseInt(config.DEFAULT_OPTION_PLAYLIST_ITEM_LIMIT);

    try {
      const status = await dqueue.add(url, quality, format, folder, customNamePrefix, playlistStrictMode, playlistItemLimit, autoStart);
      res.json(status);
    } catch (e) {
      logger.error(`Failed to add download: ${e.message}`);
      res.status(500).json({ status: 'error', msg: e.message });
    }
  });

  router.post(`${config.URL_PREFIX}delete`, csrfCheck, async (req, res) => {
    const { ids, where } = req.body;

    if (!ids || !Array.isArray(ids) || !['queue', 'done'].includes(where)) {
      return res.status(400).json({ status: 'error', msg: 'Invalid request' });
    }

    try {
      const status = where === 'queue' ? await dqueue.cancel(ids) : await dqueue.clear(ids);
      res.json(status);
    } catch (e) {
      logger.error(`Failed to delete: ${e.message}`);
      res.status(500).json({ status: 'error', msg: e.message });
    }
  });

  router.post(`${config.URL_PREFIX}start`, csrfCheck, async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ status: 'error', msg: 'Invalid ids' });
    }

    logger.info(`Received request to start pending downloads for ids: ${ids}`);

    try {
      const status = await dqueue.startPending(ids);
      res.json(status);
    } catch (e) {
      logger.error(`Failed to start pending: ${e.message}`);
      res.status(500).json({ status: 'error', msg: e.message });
    }
  });

  router.get(`${config.URL_PREFIX}history`, async (req, res) => {
    const [queue, done] = dqueue.get();
    const history = {
      queue: queue.map(([k, v]) => v),
      done: done.map(([k, v]) => v),
      pending: []
    };
    res.json(history);
  });

  router.get(`${config.URL_PREFIX}version`, (req, res) => {
    res.json({
      'yt-dlp': 'pending',
      'version': '1.0.0'
    });
  });

  router.get(`${config.URL_PREFIX}robots.txt`, (req, res) => {
    if (config.ROBOTS_TXT && existsSync(config.ROBOTS_TXT)) {
      res.sendFile(config.ROBOTS_TXT);
    } else {
      res.type('text/plain').send('User-agent: *\nDisallow: /download/\nDisallow: /audio_download/\n');
    }
  });

  router.post(`${config.URL_PREFIX}open-folder`, csrfCheck, async (req, res) => {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ status: 'error', msg: 'Missing filename' });
    }

    try {
      const { exec } = await import('child_process');
      const { resolve } = await import('path');

      // Try multiple strategies to find the file
      const candidates = [
        resolve(config.DOWNLOAD_DIR, filename),
        resolve(config.DOWNLOAD_DIR, formatFilename(filename)),
      ];

      // Also search the download directory for a partial match
      const files = readdirSync(config.DOWNLOAD_DIR);
      const normalizedSearch = formatFilename(filename);
      const partialMatch = files.find(f => {
        const normalizedFile = formatFilename(f);
        return normalizedFile === normalizedSearch || f === filename;
      });
      if (partialMatch) {
        candidates.unshift(resolve(config.DOWNLOAD_DIR, partialMatch));
      }

      const filePath = candidates.find(p => existsSync(p));

      if (!filePath) {
        // If no file found, just open the download directory
        logger.warn(`File not found for "${filename}", opening download directory instead`);
        const dirPath = resolve(config.DOWNLOAD_DIR);
        const command = process.platform === 'win32'
          ? `explorer "${dirPath}"`
          : process.platform === 'darwin'
            ? `open "${dirPath}"`
            : `xdg-open "${dirPath}"`;

        exec(command, (error) => {
          if (error) logger.error(`Failed to open folder: ${error.message}`);
        });
        return res.json({ status: 'ok' });
      }

      const command = process.platform === 'win32'
        ? `explorer /select,"${filePath}"`
        : process.platform === 'darwin'
          ? `open -R "${filePath}"`
          : `xdg-open "${config.DOWNLOAD_DIR}"`;

      exec(command, (error) => {
        if (error) {
          logger.error(`Failed to open folder: ${error.message}`);
        }
      });

      res.json({ status: 'ok' });
    } catch (e) {
      logger.error(`Failed to open folder: ${e.message}`);
      res.status(500).json({ status: 'error', msg: e.message });
    }
  });

  router.get(config.URL_PREFIX, (req, res) => {
    const indexPath = join(config.BASE_DIR, 'ui/dist/vidflow/browser/index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('UI not built. Run: npm run build:ui');
    }
  });

  return router;
}

const scanDirectories = (base, regex) => {
  const dirs = [];

  const scan = (dir, prefix = '') => {
    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const relativePath = prefix ? `${prefix}/${item}` : item;

        if (statSync(fullPath).isDirectory()) {
          if (!regex || !regex.test(relativePath)) {
            dirs.push(relativePath);
            scan(fullPath, relativePath);
          }
        }
      }
    } catch (e) {
      logger.error(`Error scanning directory ${dir}: ${e.message}`);
    }
  };

  scan(base);
  return dirs;
};

export function getCustomDirs() {
  const regex = config.CUSTOM_DIRS_EXCLUDE_REGEX ? new RegExp(config.CUSTOM_DIRS_EXCLUDE_REGEX) : null;
  const downloadDir = scanDirectories(config.DOWNLOAD_DIR, regex);
  const audioDownloadDir = config.DOWNLOAD_DIR !== config.AUDIO_DOWNLOAD_DIR
    ? scanDirectories(config.AUDIO_DOWNLOAD_DIR, regex)
    : downloadDir;

  return {
    download_dir: downloadDir,
    audio_download_dir: audioDownloadDir
  };
}
