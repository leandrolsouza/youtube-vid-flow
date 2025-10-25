import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

export class PersistentQueue {
  constructor(path) {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true });
      } catch (e) {
        throw new Error(`Failed to create directory ${dir}: ${e.message}`);
      }
    }

    this.path = path;
    this.adapter = new JSONFile(`${path}.json`);
    this.db = new Low(this.adapter, { items: {} });
    this.dict = new Map();
  }

  async load() {
    try {
      await this.db.read();
      const items = Object.entries(this.db.data.items || {})
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      for (const [key, value] of items) {
        this.dict.set(key, { info: value });
      }
    } catch (e) {
      throw new Error(`Failed to load queue from ${this.path}: ${e.message}`);
    }
  }

  exists(key) {
    return this.dict.has(key);
  }

  get(key) {
    return this.dict.get(key);
  }

  items() {
    return Array.from(this.dict.entries());
  }

  savedItems() {
    return Object.entries(this.db.data.items || {})
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
  }

  async put(value) {
    const key = value.info.url;
    this.dict.set(key, value);
    
    try {
      await this.db.read();
      this.db.data.items = this.db.data.items || {};
      this.db.data.items[key] = value.info;
      await this.db.write();
    } catch (e) {
      this.dict.delete(key);
      throw new Error(`Failed to persist queue item: ${e.message}`);
    }
  }

  async delete(key) {
    if (this.dict.has(key)) {
      this.dict.delete(key);
      
      try {
        await this.db.read();
        if (this.db.data.items?.[key]) {
          delete this.db.data.items[key];
          await this.db.write();
        }
      } catch (e) {
        throw new Error(`Failed to delete queue item: ${e.message}`);
      }
    }
  }

  next() {
    const entry = this.dict.entries().next();
    if (entry.done) {
      throw new Error('Queue is empty');
    }
    const [key, value] = entry.value;
    return [key, value];
  }

  empty() {
    return this.dict.size === 0;
  }
}
