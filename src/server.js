import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { Server } from 'socket.io';
import { config } from './config.js';
import { logger } from './logger.js';
import { DownloadQueue } from './models/index.js';
import { createRoutes, getCustomDirs } from './routes.js';
import { watchYtdlOptionsFile } from './utils/fileWatcher.js';

const app = express();
let server;

if (config.HTTPS) {
  try {
    const options = {
      cert: readFileSync(config.CERTFILE),
      key: readFileSync(config.KEYFILE)
    };
    server = createHttpsServer(options, app);
    logger.info('HTTPS enabled');
  } catch (e) {
    logger.error(`Failed to load HTTPS certificates: ${e.message}`);
    throw new Error(`HTTPS configuration failed: ${e.message}`);
  }
} else {
  server = createServer(app);
}
const io = new Server(server, {
  cors: { origin: '*' },
  path: `${config.URL_PREFIX}socket.io`
});

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    `http://localhost:${config.PORT}`,
    `http://127.0.0.1:${config.PORT}`
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Notifier for Socket.io events
class Notifier {
  async added(dl) {
    logger.info(`Notifier: Download added - ${dl.title}`);
    await io.emit('added', JSON.stringify(dl));
  }

  async updated(dl) {
    logger.info(`Notifier: Download updated - ${dl.title}`);
    await io.emit('updated', JSON.stringify(dl));
  }

  async completed(dl) {
    logger.info(`Notifier: Download completed - ${dl.title}`);
    await io.emit('completed', JSON.stringify(dl));
  }

  async canceled(id) {
    logger.info(`Notifier: Download canceled - ${id}`);
    await io.emit('canceled', JSON.stringify(id));
  }

  async cleared(id) {
    logger.info(`Notifier: Download cleared - ${id}`);
    await io.emit('cleared', JSON.stringify(id));
  }
}

const dqueue = new DownloadQueue(config, new Notifier());

// Initialize download queue
const initializeQueue = async () => {
  try {
    await dqueue.initialize();
    logger.info('Download queue initialized');
  } catch (e) {
    logger.error(`Failed to initialize download queue: ${e.message}`);
    process.exit(1);
  }
};

initializeQueue();

// Watch YTDL_OPTIONS_FILE for changes
if (config.YTDL_OPTIONS_FILE) {
  watchYtdlOptionsFile(config, io);
}

// Setup routes
app.use(createRoutes(dqueue, io));

// Static files
app.use(`${config.URL_PREFIX}download`, express.static(config.DOWNLOAD_DIR, { index: config.DOWNLOAD_DIRS_INDEXABLE }));
app.use(`${config.URL_PREFIX}audio_download`, express.static(config.AUDIO_DOWNLOAD_DIR, { index: config.DOWNLOAD_DIRS_INDEXABLE }));

// Socket.io connection
io.on('connection', async (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  try {
    const [queue, done] = dqueue.get();
    const queueData = queue.map(([, v]) => v);
    const doneData = done.map(([, v]) => v);
    
    await socket.emit('all', JSON.stringify({ queue: queueData, done: doneData }));
    await socket.emit('configuration', JSON.stringify(config));
    
    if (config.CUSTOM_DIRS) {
      await socket.emit('custom_dirs', JSON.stringify(getCustomDirs()));
    }
  } catch (e) {
    logger.error(`Failed to send initial data to client: ${e.message}`);
  }
});

server.listen(config.PORT, config.HOST, () => {
  logger.info(`Server listening on ${config.HOST}:${config.PORT}`);
});
