import chokidar from 'chokidar';
import { logger } from '../logger.js';

export function watchYtdlOptionsFile(config, io) {
  if (!config.YTDL_OPTIONS_FILE) return;

  logger.info(`Starting file watcher for: ${config.YTDL_OPTIONS_FILE}`);

  const watcher = chokidar.watch(config.YTDL_OPTIONS_FILE, {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('change', () => {
    logger.info('YTDL_OPTIONS_FILE changed, reloading...');
    try {
      config.loadYtdlOptions();
    } catch (e) {
      logger.error(`Failed to reload options: ${e.message}`);
      io.emit('ytdl_options_changed', JSON.stringify({
        success: false,
        msg: `Failed to reload: ${e.message}`,
        update_time: Date.now()
      }));
      return;
    }
    
    const result = {
      success: true,
      msg: 'Options reloaded',
      update_time: Date.now()
    };
    
    io.emit('ytdl_options_changed', JSON.stringify(result));
  });

  watcher.on('error', (error) => {
    logger.error(`File watcher error: ${error.message}`);
  });

  return watcher;
}
