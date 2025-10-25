export const AUDIO_FORMATS = ['m4a', 'mp3', 'opus', 'wav', 'flac'];

export function getFormat(format, quality) {
  const normalizedFormat = format || 'any';

  if (normalizedFormat.startsWith('custom:')) {
    const customFormat = normalizedFormat.substring(7);
    if (!customFormat || /[;&|`$()]/.test(customFormat)) {
      throw new Error('Invalid custom format');
    }
    return customFormat;
  }

  if (normalizedFormat === 'thumbnail') {
    return 'bestaudio/best';
  }

  if (AUDIO_FORMATS.includes(normalizedFormat)) {
    return `bestaudio[ext=${normalizedFormat}]/bestaudio/best`;
  }

  if (normalizedFormat === 'mp4' || normalizedFormat === 'any') {
    if (quality === 'audio') {
      return 'bestaudio/best';
    }

    const vfmt = normalizedFormat === 'mp4' ? '[ext=mp4]' : '';
    const afmt = normalizedFormat === 'mp4' ? '[ext=m4a]' : '';
    const vres = !['best', 'best_ios', 'worst'].includes(quality) ? `[height<=${quality}]` : '';
    const vcombo = vres + vfmt;

    if (quality === 'best_ios') {
      return `bestvideo[vcodec~='^((he|a)vc|h26[45])'${vres}]+bestaudio[acodec=aac]/bestvideo[vcodec~='^((he|a)vc|h26[45])'${vres}]+bestaudio${afmt}/bestvideo${vcombo}+bestaudio${afmt}/best${vcombo}`;
    }
    return `bestvideo${vcombo}+bestaudio${afmt}/best${vcombo}`;
  }

  throw new Error(`Unknown format: ${normalizedFormat}`);
}

const addAudioPostprocessors = (format, quality, opts, postprocessors) => {
  postprocessors.push({
    key: 'FFmpegExtractAudio',
    preferredcodec: format,
    preferredquality: quality === 'best' ? 0 : quality
  });

  if (format !== 'wav' && !opts.writethumbnail) {
    opts.writethumbnail = true;
    postprocessors.push(
      { key: 'FFmpegThumbnailsConvertor', format: 'jpg', when: 'before_dl' },
      { key: 'FFmpegMetadata' },
      { key: 'EmbedThumbnail' }
    );
  }
};

const addThumbnailPostprocessors = (opts, postprocessors) => {
  opts.skip_download = true;
  opts.writethumbnail = true;
  postprocessors.push({
    key: 'FFmpegThumbnailsConvertor',
    format: 'jpg',
    when: 'before_dl'
  });
};

export function getOpts(format, quality, ytdlOpts) {
  const opts = { ...ytdlOpts };
  const postprocessors = [];

  if (AUDIO_FORMATS.includes(format)) {
    addAudioPostprocessors(format, quality, opts, postprocessors);
  }

  if (format === 'thumbnail') {
    addThumbnailPostprocessors(opts, postprocessors);
  }

  opts.postprocessors = [...postprocessors, ...(opts.postprocessors || [])];
  return opts;
}
