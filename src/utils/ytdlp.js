import { spawn } from 'child_process';
import { platform } from 'os';

export function getYtdlpCommand() {
  // No Windows, tenta python -m yt_dlp primeiro
  if (platform() === 'win32') {
    return 'python';
  }
  return 'yt-dlp';
}

export function spawnYtdlp(args) {
  const cmd = getYtdlpCommand();
  const sanitizedArgs = args.map(arg => String(arg).replace(/[;&|`$]/g, ''));
  
  if (cmd === 'python') {
    return spawn('python', ['-m', 'yt_dlp', ...sanitizedArgs], { shell: false });
  }
  
  return spawn(cmd, sanitizedArgs, { shell: false });
}
