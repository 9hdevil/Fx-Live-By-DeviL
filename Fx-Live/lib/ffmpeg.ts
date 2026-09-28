import { spawn, ChildProcess, exec } from 'child_process';
import { getDb, logActivity } from './database';
import { registerStream, unregisterStream } from './stream-manager';
import { killFFmpegProcess } from './processKiller';
import { updateStreamStats, clearStreamStats } from './streamStats';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface StreamProcess {
  process: ChildProcess;
  streamId: number;
  pid?: number;
}

const activeStreams = new Map<number, StreamProcess>();

export interface StreamOptions {
  videoPath: string;
  rtmpUrl: string;
  quality: string;
  loop: boolean;
}

export interface QualityPreset {
  resolution: string;
  videoBitrate: string;
  minBitrate: string;
  maxBitrate: string;
  bufferSize: string;
  fps: string;
  audioBitrate: string;
  audioSampleRate: string;
  label: string;
  description: string;
}

export const qualityPresets: Record<string, QualityPreset> = {
  '360p': {
    resolution: '640:360',
    videoBitrate: '450k',
    minBitrate: '400k',
    maxBitrate: '550k',
    bufferSize: '800k',
    fps: '24',
    audioBitrate: '64k',
    audioSampleRate: '44100',
    label: '360p Ultra-Low',
    description: '360p Ultra-Low (500 kbps - Zero buffering on 2G/3G & slow networks)',
  },
  '480p': {
    resolution: '854:480',
    videoBitrate: '800k',
    minBitrate: '700k',
    maxBitrate: '950k',
    bufferSize: '1200k',
    fps: '30',
    audioBitrate: '96k',
    audioSampleRate: '44100',
    label: '480p SD Eco',
    description: '480p SD Eco (900 kbps - Smooth & reliable on slow WiFi / mobile data)',
  },
  '720p-low': {
    resolution: '1280:720',
    videoBitrate: '1300k',
    minBitrate: '1100k',
    maxBitrate: '1500k',
    bufferSize: '2000k',
    fps: '30',
    audioBitrate: '128k',
    audioSampleRate: '44100',
    label: '720p Low Bandwidth',
    description: '720p HD Low-Bandwidth (1.4 Mbps - Great HD quality on moderate speed)',
  },
  '720p': {
    resolution: '1280:720',
    videoBitrate: '2000k',
    minBitrate: '1800k',
    maxBitrate: '2300k',
    bufferSize: '3000k',
    fps: '30',
    audioBitrate: '128k',
    audioSampleRate: '44100',
    label: '720p Standard',
    description: '720p HD Standard (2.2 Mbps - Balanced HD broadcast)',
  },
  '1080p': {
    resolution: '1920:1080',
    videoBitrate: '3500k',
    minBitrate: '3200k',
    maxBitrate: '4000k',
    bufferSize: '5000k',
    fps: '30',
    audioBitrate: '160k',
    audioSampleRate: '44100',
    label: '1080p Full HD',
    description: '1080p Full HD (3.8 Mbps - High-speed broadband connection required)',
  },
};

export async function startStream(streamId: number, options: StreamOptions): Promise<void> {
  const preset = qualityPresets[options.quality] || qualityPresets['720p'] || qualityPresets['480p'];
  
  // Calculate GOP (Keyframe interval) based on FPS: 2 seconds per keyframe
  const fpsNum = parseInt(preset.fps) || 30;
  const gopSize = (fpsNum * 2).toString(); // e.g. 60 frames for 30fps

  // Low-bandwidth & zero-buffering optimized FFmpeg arguments
  const args = [
    '-re', // Real-time read rate
    ...(options.loop ? ['-stream_loop', '-1'] : []),
    '-i', options.videoPath,
    '-metadata', `comment=streamid:${streamId}`,
    '-metadata', `title=Stream ${streamId}`,
    
    // Video Encoding Settings
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    
    // Strict Constant Bitrate (CBR) & Tight Buffer to prevent network burst starvation
    '-b:v', preset.videoBitrate,
    '-minrate', preset.minBitrate,
    '-maxrate', preset.maxBitrate,
    '-bufsize', preset.bufferSize,
    
    // Keyframe GOP settings (essential for YouTube / RTMP live ingest stability without buffering)
    '-g', gopSize,
    '-keyint_min', fpsNum.toString(),
    '-sc_threshold', '0',
    
    // Resolution & Framerate
    '-vf', `scale=${preset.resolution}`,
    '-r', preset.fps,
    
    // Audio Encoding Settings
    '-c:a', 'aac',
    '-b:a', preset.audioBitrate,
    '-ar', preset.audioSampleRate,
    
    // Output Container & Network Resilience
    '-flvflags', 'no_duration_filesize',
    '-f', 'flv',
    options.rtmpUrl,
  ];

  // Try to find ffmpeg in common locations or use system PATH
  let ffmpegPath = 'ffmpeg';
  
  // Check common Windows locations
  const possiblePaths = [
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    path.join(process.cwd(), 'ffmpeg', 'bin', 'ffmpeg.exe'),
    path.join(process.cwd(), 'ffmpeg', 'ffmpeg.exe'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      ffmpegPath = p;
      console.log('Using FFmpeg from:', p);
      break;
    }
  }
  
  const ffmpegProcess = spawn(ffmpegPath, args, {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  console.log(`Started FFmpeg process for stream ${streamId} with PID: ${ffmpegProcess.pid} using preset: ${preset.label}`);
  
  activeStreams.set(streamId, {
    process: ffmpegProcess,
    streamId,
    pid: ffmpegProcess.pid || undefined,
  });

  const db = await getDb();

  ffmpegProcess.on('error', async (error) => {
    console.error(`FFmpeg error for stream ${streamId}:`, error);
    await db.run(
      'UPDATE streams SET status = ?, error_message = ?, pid = NULL WHERE id = ?',
      ['error', error.message, streamId]
    );
    await logActivity('stream_error', `Stream ${streamId} encountered an error: ${error.message}`);
    activeStreams.delete(streamId);
    unregisterStream(streamId);
  });

  ffmpegProcess.on('exit', async (code, signal) => {
    console.log(`[STREAM EXIT] Stream ${streamId} - Code: ${code}, Signal: ${signal}, Time: ${new Date().toISOString()}`);
    
    // Remove from active streams immediately
    activeStreams.delete(streamId);
    unregisterStream(streamId);
    clearStreamStats(streamId);
    
    if (code !== 0 && code !== null && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
      console.error(`[UNEXPECTED EXIT] Stream ${streamId} exited unexpectedly with code ${code}`);
      const errorLines = errorOutput.split('\n').filter(line => 
        line.includes('error') || line.includes('Error') || line.includes('failed')
      );
      
      const errorMessage = errorLines.length > 0 
        ? `Stream error: ${errorLines[errorLines.length - 1]}`
        : `Process exited with code ${code}`;
        
      await db.run(
        'UPDATE streams SET status = ?, error_message = ?, pid = NULL WHERE id = ?',
        ['stopped', errorMessage, streamId]
      );
    } else {
      console.log(`[CLEAN EXIT] Stream ${streamId} stopped cleanly`);
      await db.run(
        'UPDATE streams SET status = ?, error_message = NULL, pid = NULL WHERE id = ?',
        ['stopped', streamId]
      );
    }
  });

  let errorOutput = '';
  
  ffmpegProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    errorOutput += output;
    
    // Update stream statistics
    updateStreamStats(streamId, output);
  });

  ffmpegProcess.on('close', (code, signal) => {
    if (activeStreams.has(streamId)) {
      activeStreams.delete(streamId);
      unregisterStream(streamId);
    }
  });

  // Update stream status to running
  await db.run(
    'UPDATE streams SET status = ?, pid = ?, started_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = ?',
    ['running', ffmpegProcess.pid || null, streamId]
  );

  // Register stream globally
  registerStream(streamId);

  await logActivity('stream_started', `Stream ${streamId} started with preset ${preset.label}`);
}

export async function stopStream(streamId: number, caller?: string): Promise<void> {
  const streamProcess = activeStreams.get(streamId);
  const db = await getDb();
  
  console.log(`[STOP REQUEST] Stream ${streamId} - Process exists: ${!!streamProcess}, Caller: ${caller || new Error().stack?.split('\n')[2]?.trim()}`);
  
  const stream = await db.get('SELECT status, pid, rtmp_url FROM streams WHERE id = ?', [streamId]);
  if (!stream) {
    console.error(`[STOP ABORT] Stream ${streamId} not found in database`);
    return;
  }
  
  if (stream.status !== 'running') {
    console.log(`[STOP SKIP] Stream ${streamId} is already ${stream.status}, skipping stop`);
    return;
  }
  
  activeStreams.delete(streamId);
  unregisterStream(streamId);
  
  await db.run(
    'UPDATE streams SET status = ?, pid = NULL WHERE id = ?',
    ['stopped', streamId]
  );
  
  let killed = false;
  
  if (streamProcess?.process && !streamProcess.process.killed) {
    try {
      streamProcess.process.kill('SIGKILL');
      killed = true;
    } catch (e) {}
  }
  
  const pid = streamProcess?.process?.pid || stream?.pid;
  if (pid && !killed) {
    try {
      await execAsync(`kill -9 ${pid}`);
      killed = true;
    } catch (e) {
      try {
        process.kill(pid, 'SIGKILL');
        killed = true;
      } catch (e2) {}
    }
  }
  
  try {
    const { stdout: psOutput } = await execAsync(`ps aux | grep ffmpeg | grep "streamid:${streamId}" | grep -v grep`);
    const processes = psOutput.trim().split('\n').filter(line => line);
    
    for (const proc of processes) {
      const parts = proc.split(/\s+/);
      const procPid = parts[1];
      if (procPid) {
        try {
          await execAsync(`kill -9 ${procPid}`);
          killed = true;
        } catch (e) {}
      }
    }
  } catch (e) {}
  
  if (!killed && stream?.rtmp_url) {
    try {
      const { stdout } = await execAsync(`ps aux | grep ffmpeg | grep "${stream.rtmp_url}" | grep -v grep`);
      const processes = stdout.trim().split('\n').filter(line => line);
      
      for (const proc of processes) {
        const parts = proc.split(/\s+/);
        const procPid = parts[1];
        if (procPid) {
          try {
            await execAsync(`kill -9 ${procPid}`);
            killed = true;
          } catch (e) {}
        }
      }
    } catch (e) {}
    
    if (!killed) {
      try {
        await execAsync(`pkill -9 -f "streamid:${streamId}"`);
      } catch (e) {
        try {
          await execAsync(`pkill -9 -f "${stream.rtmp_url}"`);
        } catch (e2) {}
      }
    }
  }
  
  if (!killed) {
    try {
      const scriptPath = path.join(process.cwd(), 'scripts', 'kill-stream.sh');
      if (fs.existsSync(scriptPath)) {
        await execAsync(`sh "${scriptPath}" ${streamId} "${stream?.rtmp_url || ''}"`);
      }
    } catch (e) {}
  }
  
  clearStreamStats(streamId);
  await logActivity('stream_stopped', `Stream ${streamId} stop requested`);
}

export function getActiveStreams(): number[] {
  return Array.from(activeStreams.keys());
}

export async function stopAllStreams(): Promise<void> {
  activeStreams.forEach((streamProcess) => {
    streamProcess.process.kill('SIGTERM');
  });
  activeStreams.clear();
  
  const db = await getDb();
  await db.run('UPDATE streams SET status = ?, pid = NULL WHERE status = ?', ['stopped', 'running']);
}