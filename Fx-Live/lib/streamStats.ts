interface StreamStats {
  streamId: number;
  bitrate: number; // in kbps
  fps: number;
  speed: number; // encoding speed (1.0 = realtime)
  droppedFrames: number;
  totalFrames: number;
  dataTransferred: number; // in bytes
  duration: number; // in seconds
  lastUpdate: Date;
  errors: string[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

// In-memory storage for stream statistics
const streamStatsMap = new Map<number, StreamStats>();

export function updateStreamStats(streamId: number, data: string) {
  // Parse FFmpeg output for statistics
  const stats = streamStatsMap.get(streamId) || {
    streamId,
    bitrate: 0,
    fps: 0,
    speed: 0,
    droppedFrames: 0,
    totalFrames: 0,
    dataTransferred: 0,
    duration: 0,
    lastUpdate: new Date(),
    errors: [],
    quality: 'good' as const
  };

  // Parse bitrate (e.g., "bitrate=1234.5kbits/s")
  const bitrateMatch = data.match(/bitrate=\s*([0-9.]+)kbits\/s/);
  if (bitrateMatch) {
    stats.bitrate = parseFloat(bitrateMatch[1]);
  }

  // Parse FPS (e.g., "fps= 30")
  const fpsMatch = data.match(/fps=\s*([0-9.]+)/);
  if (fpsMatch) {
    stats.fps = parseFloat(fpsMatch[1]);
  }

  // Parse speed (e.g., "speed=1.00x")
  const speedMatch = data.match(/speed=\s*([0-9.]+)x/);
  if (speedMatch) {
    stats.speed = parseFloat(speedMatch[1]);
  }

  // Parse time/duration (e.g., "time=00:01:23.45")
  const timeMatch = data.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const seconds = parseFloat(timeMatch[3]);
    stats.duration = hours * 3600 + minutes * 60 + seconds;
  }

  // Parse size (e.g., "size=  123456kB")
  const sizeMatch = data.match(/size=\s*([0-9]+)kB/);
  if (sizeMatch) {
    stats.dataTransferred = parseInt(sizeMatch[1]) * 1024; // Convert to bytes
  }

  // Check for errors
  if (data.toLowerCase().includes('error')) {
    const errorMatch = data.match(/error[^:]*:\s*(.+)/i);
    if (errorMatch) {
      stats.errors.push(errorMatch[1]);
      // Keep only last 10 errors
      if (stats.errors.length > 10) {
        stats.errors = stats.errors.slice(-10);
      }
    }
  }

  // Check for dropped frames
  const dropMatch = data.match(/frame=\s*(\d+).*dup=\s*(\d+).*drop=\s*(\d+)/);
  if (dropMatch) {
    stats.totalFrames = parseInt(dropMatch[1]);
    stats.droppedFrames = parseInt(dropMatch[3]);
  }

  // Calculate quality based on metrics
  stats.quality = calculateStreamQuality(stats);
  stats.lastUpdate = new Date();

  streamStatsMap.set(streamId, stats);
}

function calculateStreamQuality(stats: StreamStats): 'excellent' | 'good' | 'fair' | 'poor' {
  let score = 100;

  // Speed factor (ideal is 0.95-1.05x)
  if (stats.speed < 0.9 || stats.speed > 1.1) {
    score -= 20;
  } else if (stats.speed < 0.95 || stats.speed > 1.05) {
    score -= 10;
  }

  // FPS factor (should be close to 30)
  if (stats.fps < 25) {
    score -= 20;
  } else if (stats.fps < 28) {
    score -= 10;
  }

  // Bitrate factor (should be stable)
  const targetBitrate = 2500; // Assuming 720p default
  const bitrateDiff = Math.abs(stats.bitrate - targetBitrate) / targetBitrate;
  if (bitrateDiff > 0.3) {
    score -= 20;
  } else if (bitrateDiff > 0.15) {
    score -= 10;
  }

  // Dropped frames factor
  if (stats.totalFrames > 0) {
    const dropRate = stats.droppedFrames / stats.totalFrames;
    if (dropRate > 0.05) {
      score -= 30;
    } else if (dropRate > 0.02) {
      score -= 15;
    } else if (dropRate > 0.01) {
      score -= 5;
    }
  }

  // Error factor
  if (stats.errors.length > 5) {
    score -= 30;
  } else if (stats.errors.length > 2) {
    score -= 15;
  } else if (stats.errors.length > 0) {
    score -= 5;
  }

  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

export function getStreamStats(streamId: number): StreamStats | null {
  return streamStatsMap.get(streamId) || null;
}

export function getAllStreamStats(): StreamStats[] {
  return Array.from(streamStatsMap.values());
}

export function clearStreamStats(streamId: number) {
  streamStatsMap.delete(streamId);
}

export function getAverageStats(): {
  avgBitrate: number;
  avgFps: number;
  avgSpeed: number;
  totalDataTransferred: number;
  totalDroppedFrames: number;
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  problemStreams: number[];
} {
  const allStats = getAllStreamStats();
  
  if (allStats.length === 0) {
    return {
      avgBitrate: 0,
      avgFps: 0,
      avgSpeed: 0,
      totalDataTransferred: 0,
      totalDroppedFrames: 0,
      overallQuality: 'good',
      problemStreams: []
    };
  }

  const sum = allStats.reduce((acc, stats) => ({
    bitrate: acc.bitrate + stats.bitrate,
    fps: acc.fps + stats.fps,
    speed: acc.speed + stats.speed,
    dataTransferred: acc.dataTransferred + stats.dataTransferred,
    droppedFrames: acc.droppedFrames + stats.droppedFrames
  }), { bitrate: 0, fps: 0, speed: 0, dataTransferred: 0, droppedFrames: 0 });

  const problemStreams = allStats
    .filter(s => s.quality === 'poor' || s.quality === 'fair' || s.errors.length > 0)
    .map(s => s.streamId);

  // Calculate overall quality
  const qualityScores = allStats.map(s => 
    s.quality === 'excellent' ? 4 : 
    s.quality === 'good' ? 3 : 
    s.quality === 'fair' ? 2 : 1
  );
  const avgQualityScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
  
  let overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  if (avgQualityScore >= 3.5) overallQuality = 'excellent';
  else if (avgQualityScore >= 2.5) overallQuality = 'good';
  else if (avgQualityScore >= 1.5) overallQuality = 'fair';
  else overallQuality = 'poor';

  return {
    avgBitrate: Math.round(sum.bitrate / allStats.length),
    avgFps: Math.round(sum.fps / allStats.length * 10) / 10,
    avgSpeed: Math.round(sum.speed / allStats.length * 100) / 100,
    totalDataTransferred: sum.dataTransferred,
    totalDroppedFrames: sum.droppedFrames,
    overallQuality,
    problemStreams
  };
}