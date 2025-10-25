export class DownloadInfo {
  constructor(id, title, url, quality, format, folder, customNamePrefix, error, entry, playlistItemLimit) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }
    
    this.id = customNamePrefix ? `${customNamePrefix}.${id}` : id;
    this.title = customNamePrefix ? `${customNamePrefix}.${title}` : title;
    this.url = url;
    this.quality = quality;
    this.format = format;
    this.folder = folder || null;
    this.custom_name_prefix = customNamePrefix || null;
    this.msg = error || null;
    this.percent = null;
    this.speed = null;
    this.eta = null;
    this.status = 'pending';
    this.size = null;
    this.timestamp = Date.now() * 1000000;
    this.error = error || null;
    this.entry = entry || null;
    this.playlist_item_limit = playlistItemLimit || 0;
  }
}
