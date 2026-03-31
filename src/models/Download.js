import { existsSync, unlinkSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { getFormat, getOpts } from './formats.js';
import { logger } from '../logger.js';
import { spawnYtdlp } from '../utils/ytdlp.js';
import { config } from '../config.js';

export class Download {
  constructor(downloadDir, tempDir, outputTemplate, outputTemplateChapter, quality, format, ytdlOpts, info) {
    this.downloadDir = downloadDir;
    this.tempDir = tempDir;
    this.outputTemplate = outputTemplate;
    this.outputTemplateChapter = outputTemplateChapter;
    this.format = getFormat(format, quality);
    this.ytdlOpts = getOpts(format, quality, ytdlOpts);
    this.info = info;
    this.canceled = false;
    this.tmpfilename = null;
    this.proc = null;
    this.notifier = null;
  }

  async start(notifier) {
    logger.info(`Preparing download for: ${this.info.title}`);
    this.notifier = notifier;
    this.info.status = 'preparing';

    try {
      await this.notifier.updated(this.info);
    } catch (e) {
      logger.error(`Failed to notify update: ${e.message}`);
    }

    return new Promise((resolve) => {
      const args = [
        '--no-color',
        '--newline',
        '--progress',
        '-o', this.outputTemplate,
        '-P', this.downloadDir,
        '-P', `temp:${this.tempDir}`,
        '-f', this.format,
        '--socket-timeout', '30',
        '--ignore-no-formats-error',
        ...this.buildCookieArgs(),
        ...this.buildYtdlArgs(),
        this.info.url
      ];

      this.proc = spawnYtdlp(args);

      this.proc.stdout.on('data', (data) => {
        try {
          const output = data.toString();
          logger.info(`yt-dlp stdout: ${output}`);
          this.parseProgress(output);
        } catch (e) {
          logger.error(`Failed to parse progress: ${e.message}`);
        }
      });

      this.proc.stderr.on('data', (data) => {
        logger.error(`yt-dlp error: ${data}`);
      });

      this.proc.on('error', (err) => {
        logger.error(`Process error: ${err.message}`);
        this.info.status = 'error';
        this.info.msg = err.message;
        resolve();
      });

      this.proc.on('close', (code) => {
        this.info.status = code === 0 ? 'finished' : 'error';
        if (code !== 0 && !this.canceled) {
          this.info.msg = `Process exited with code ${code}`;
        }

        // Se o download foi bem-sucedido, tenta capturar o nome final do arquivo
        if (code === 0 && !this.canceled) {
          this.captureActualFilename();
        }

        resolve();
      });
    });
  }

  buildCookieArgs() {
    const args = [];
    if (config.COOKIES_FROM_BROWSER) {
      args.push('--cookies-from-browser', config.COOKIES_FROM_BROWSER);
    } else if (config.COOKIES_FILE && existsSync(config.COOKIES_FILE)) {
      args.push('--cookies', config.COOKIES_FILE);
    }
    return args;
  }

  buildYtdlArgs() {
    const args = [];
    for (const [key, value] of Object.entries(this.ytdlOpts)) {
      if (key === 'postprocessors' || value === null || value === undefined) continue;

      const flag = `--${key.replace(/_/g, '-')}`;
      if (typeof value === 'boolean') {
        if (value) args.push(flag);
      } else {
        args.push(flag, String(value));
      }
    }
    return args;
  }

  parseProgress(output) {
    const lines = output.split('\n');

    for (const line of lines) {
      this.parseDownloadProgress(line);
      this.parseDestination(line);
      this.parseFinalFilename(line);
      this.checkAlreadyDownloaded(line);
    }
  }

  parseDownloadProgress(line) {
    if (!line.includes('[download]')) return;

    logger.info(`Progress line: ${line}`);

    // Match various percentage formats: 50.1%, 100%
    const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
    // Match speed formats: 1.2MiB/s, 500KiB/s, 1.5MB/s
    const speedMatch = line.match(/(\d+(?:\.\d+)?)(\w+)\/s/);
    // Match ETA formats: ETA 01:23, ETA 00:05
    const etaMatch = line.match(/ETA\s+(\d+):(\d+)/);

    if (percentMatch) {
      this.info.percent = parseFloat(percentMatch[1]);
      logger.info(`Parsed percent: ${this.info.percent}`);
    }
    if (speedMatch) {
      const value = parseFloat(speedMatch[1]);
      const unit = speedMatch[2].toLowerCase();
      // Convert to bytes per second
      if (unit.includes('k')) this.info.speed = value * 1024;
      else if (unit.includes('m')) this.info.speed = value * 1024 * 1024;
      else if (unit.includes('g')) this.info.speed = value * 1024 * 1024 * 1024;
      else this.info.speed = value;
      logger.info(`Parsed speed: ${this.info.speed} (${value}${unit})`);
    }
    if (etaMatch) {
      const minutes = parseInt(etaMatch[1]);
      const seconds = parseInt(etaMatch[2]);
      this.info.eta = minutes * 60 + seconds;
      logger.info(`Parsed ETA: ${this.info.eta} seconds`);
    }

    if (percentMatch || speedMatch || etaMatch) {
      this.info.status = 'downloading';
      try {
        this.notifier?.updated(this.info);
        logger.info(`Updated progress: ${this.info.percent}% - ${this.info.speed} B/s - ${this.info.eta}s`);
      } catch (e) {
        logger.error(`Failed to notify update: ${e.message}`);
      }
    }
  }

  parseDestination(line) {
    if (!line.includes('Destination:')) return;

    const pathMatch = line.match(/Destination: (.+)$/);
    if (pathMatch) {
      this.tmpfilename = pathMatch[1].trim();
    }
  }

  parseFinalFilename(line) {
    // Captura quando o arquivo é movido para o destino final
    if (line.includes('[download] ') && line.includes(' has already been downloaded')) {
      const pathMatch = line.match(/\[download\] (.+) has already been downloaded/);
      if (pathMatch) {
        const fullPath = pathMatch[1].trim();
        this.info.entry = this.info.entry || {};
        this.info.entry.filename = basename(fullPath);
      }
    }
    // Captura quando o download é concluído
    else if (line.includes('[download] ') && line.includes('100%')) {
      // Tenta encontrar o nome do arquivo no final do download
      const pathMatch = line.match(/\[download\].*?([^\s\/\\]+\.[a-zA-Z0-9]+)\s/);
      if (pathMatch) {
        this.info.entry = this.info.entry || {};
        this.info.entry.filename = pathMatch[1];
      }
    }
  }

  checkAlreadyDownloaded(line) {
    if (line.includes('has already been downloaded')) {
      this.info.status = 'finished';
    }
  }

  cancel() {
    logger.info(`Cancelling download: ${this.info.title}`);
    this.canceled = true;
    if (this.proc) {
      this.proc.kill();
    }
  }

  close() {
    logger.info(`Closing download process for: ${this.info.title}`);

    if (this.proc && !this.proc.killed) {
      try {
        this.proc.kill();
      } catch (e) {
        logger.error(`Failed to kill process: ${e.message}`);
      }
    }

    if (this.tmpfilename && existsSync(this.tmpfilename)) {
      try {
        unlinkSync(this.tmpfilename);
      } catch (e) {
        logger.error(`Failed to delete temp file: ${e.message}`);
      }
    }
  }

  running() {
    return this.proc && !this.proc.killed;
  }

  started() {
    return this.proc !== null;
  }

  normalizeFilename(title, ext = 'mp4') {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, '') // Remove hífens do início e fim
      .substring(0, 100) + '.' + ext; // Limita a 100 caracteres
  }

  captureActualFilename() {
    try {
      // Usa yt-dlp para obter o nome exato do arquivo que seria gerado
      const args = [
        '--print', 'filename',
        '-o', this.outputTemplate,
        '-P', this.downloadDir,
        ...this.buildCookieArgs(),
        this.info.url
      ];

      const proc = spawnYtdlp(args);
      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const filename = basename(output.trim());
          this.info.entry = this.info.entry || {};
          this.info.entry.filename = filename;
          this.info.entry.originalTitle = this.info.title; // Salva o título original
          logger.info(`Captured filename: ${filename}`);
        }
      });
    } catch (e) {
      logger.error(`Failed to capture filename: ${e.message}`);
    }
  }
}
