import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
  DOWNLOAD_DIR: './downloads',
  AUDIO_DOWNLOAD_DIR: '',
  TEMP_DIR: '',
  DOWNLOAD_DIRS_INDEXABLE: 'false',
  CUSTOM_DIRS: 'true',
  CREATE_CUSTOM_DIRS: 'true',
  CUSTOM_DIRS_EXCLUDE_REGEX: '(^|/)[.@].*$',
  DELETE_FILE_ON_TRASHCAN: 'false',
  STATE_DIR: './downloads/.vidflow',
  URL_PREFIX: '/',
  PUBLIC_HOST_URL: 'download/',
  PUBLIC_HOST_AUDIO_URL: 'audio_download/',
  OUTPUT_TEMPLATE: '%(title)s.%(ext)s',
  OUTPUT_TEMPLATE_CHAPTER: '%(title)s - %(section_number)s %(section_title)s.%(ext)s',
  OUTPUT_TEMPLATE_PLAYLIST: '%(playlist_title)s/%(title)s.%(ext)s',
  DEFAULT_OPTION_PLAYLIST_STRICT_MODE: 'false',
  DEFAULT_OPTION_PLAYLIST_ITEM_LIMIT: '0',
  YTDL_OPTIONS: '{}',
  YTDL_OPTIONS_FILE: '',
  COOKIES_FROM_BROWSER: '',
  COOKIES_FILE: '',
  ROBOTS_TXT: '',
  HOST: '0.0.0.0',
  PORT: '8081',
  HTTPS: 'false',
  CERTFILE: '',
  KEYFILE: '',
  BASE_DIR: resolve(__dirname, '..'),
  DEFAULT_THEME: 'auto',
  DOWNLOAD_MODE: 'limited',
  MAX_CONCURRENT_DOWNLOADS: '3',
  LOGLEVEL: 'INFO',
  ENABLE_ACCESSLOG: 'false'
};

const BOOLEAN_KEYS = [
  'DOWNLOAD_DIRS_INDEXABLE',
  'CUSTOM_DIRS',
  'CREATE_CUSTOM_DIRS',
  'DELETE_FILE_ON_TRASHCAN',
  'DEFAULT_OPTION_PLAYLIST_STRICT_MODE',
  'HTTPS',
  'ENABLE_ACCESSLOG'
];

class Config {
  constructor() {
    this.initializeDefaults();
    this.handleReferences();
    this.convertBooleans();
    this.normalizeUrlPrefix();
    this.loadYtdlOptions();
  }

  initializeDefaults() {
    for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
      this[key] = process.env[key] || defaultValue;
    }
  }

  handleReferences() {
    if (!this.AUDIO_DOWNLOAD_DIR) this.AUDIO_DOWNLOAD_DIR = this.DOWNLOAD_DIR;
    if (!this.TEMP_DIR) this.TEMP_DIR = this.DOWNLOAD_DIR;
  }

  convertBooleans() {
    for (const key of BOOLEAN_KEYS) {
      this[key] = ['true', 'True', 'on', '1'].includes(this[key]);
    }
  }

  normalizeUrlPrefix() {
    if (!this.URL_PREFIX.endsWith('/')) {
      this.URL_PREFIX += '/';
    }
  }

  loadYtdlOptions() {
    try {
      this.YTDL_OPTIONS = JSON.parse(process.env.YTDL_OPTIONS || '{}');
    } catch (e) {
      throw new Error(`Invalid YTDL_OPTIONS JSON: ${e.message}`);
    }

    if (this.YTDL_OPTIONS_FILE && existsSync(this.YTDL_OPTIONS_FILE)) {
      try {
        const fileOpts = JSON.parse(readFileSync(this.YTDL_OPTIONS_FILE, 'utf8'));
        this.YTDL_OPTIONS = { ...fileOpts, ...this.YTDL_OPTIONS };
      } catch (e) {
        throw new Error(`Invalid YTDL_OPTIONS_FILE: ${e.message}`);
      }
    }
  }
}

export const config = new Config();
