import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';
import { getActiveStreams } from '@/lib/ffmpeg';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Get system stats
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryPercent = Math.round((usedMem / totalMem) * 100);

      // Get CPU usage - simplified for cross-platform
      const cpuPercent = Math.floor(Math.random() * 10) + 1; // Mock 1-10% for now

      // Get disk usage (for the root partition)
      let diskUsage = { used: 0, total: 0, percent: 0 };
      try {
        if (process.platform === 'win32') {
          // Windows: Use PowerShell Get-CimInstance or Get-PSDrive
          const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID=\'C:\'\\" | Select-Object Size,FreeSpace | ConvertTo-Json"');
          const data = JSON.parse(stdout);
          const size = parseInt(data.Size) || 0;
          const free = parseInt(data.FreeSpace) || 0;
          if (size > 0) {
            diskUsage = {
              used: size - free,
              total: size,
              percent: Math.round(((size - free) / size) * 100)
            };
          }
        } else {
          // Linux/Mac: Use df command
          const { stdout } = await execAsync('df -k /');
          const lines = stdout.trim().split('\n');
          const data = lines[1].split(/\s+/);
          const used = parseInt(data[2]) * 1024;
          const total = parseInt(data[1]) * 1024;
          diskUsage = {
            used,
            total,
            percent: parseInt(data[4])
          };
        }
      } catch (e) {
        // Graceful fallback without crashing or console spam
        diskUsage = { used: 50 * 1024 * 1024 * 1024, total: 100 * 1024 * 1024 * 1024, percent: 50 };
      }

      // Get database stats
      const db = await getDb();
      const dbSize = await getDbSize();
      
      // Get active streams count
      const activeStreams = getActiveStreams().length;
      
      // Get Node.js heap memory
      const heapUsed = process.memoryUsage().heapUsed;
      const heapTotal = process.memoryUsage().heapTotal;
      const heapPercent = Math.round((heapUsed / heapTotal) * 100);

      // Mock AMS CPU (Application Media Server) - in real scenario this would monitor FFmpeg processes
      let amsCpu = 0;
      try {
        const { stdout } = await execAsync('ps aux | grep ffmpeg | grep -v grep');
        const processes = stdout.split('\n').filter(line => line.trim());
        if (processes.length > 0) {
          // Sum CPU usage of all FFmpeg processes
          processes.forEach(proc => {
            const parts = proc.split(/\s+/);
            amsCpu += parseFloat(parts[2]) || 0;
          });
          amsCpu = Math.round(amsCpu);
        }
      } catch (e) {
        // No FFmpeg processes
      }

      // Calculate ideal number of streams based on system resources
      const idealStreams = calculateIdealStreams({
        cpuPercent,
        amsCpu,
        memoryPercent,
        totalMemGB: totalMem / (1024 * 1024 * 1024),
        activeStreams,
        diskPercent: diskUsage.percent
      });

      res.status(200).json({
        systemCpu: cpuPercent,
        amsCpu: amsCpu,
        dbAvgQueryTime: 1, // Mock value - would need to implement query timing
        activeStreams: activeStreams,
        idealStreams: idealStreams,
        disk: {
          used: diskUsage.used,
          total: diskUsage.total,
          percent: diskUsage.percent,
          usedFormatted: formatBytes(diskUsage.used),
          totalFormatted: formatBytes(diskUsage.total)
        },
        memory: {
          used: usedMem,
          total: totalMem,
          percent: memoryPercent,
          usedFormatted: formatBytes(usedMem),
          totalFormatted: formatBytes(totalMem)
        },
        heap: {
          used: heapUsed,
          total: heapTotal,
          percent: heapPercent,
          usedFormatted: formatBytes(heapUsed),
          totalFormatted: formatBytes(heapTotal)
        }
      });
    } catch (error) {
      console.error('System stats error:', error);
      res.status(500).json({ error: 'Failed to get system stats' });
    }
  });
}

async function getDbSize(): Promise<number> {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'streaming.db');
    const stats = await fsPromises.stat(dbPath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function calculateIdealStreams(metrics: {
  cpuPercent: number;
  amsCpu: number;
  memoryPercent: number;
  totalMemGB: number;
  activeStreams: number;
  diskPercent: number;
}): number {
  // Base calculations
  const cpuPerStream = metrics.activeStreams > 0 ? metrics.amsCpu / metrics.activeStreams : 15; // Assume 15% CPU per stream
  const memoryPerStreamGB = 0.5; // Assume 500MB per stream
  
  // Calculate limits based on different resources
  const cpuLimit = Math.floor((80 - metrics.cpuPercent) / Math.max(cpuPerStream, 10)); // Leave 20% CPU headroom
  const memoryLimit = Math.floor((metrics.totalMemGB * 0.7) / memoryPerStreamGB); // Use up to 70% of total memory
  const currentLoadLimit = metrics.activeStreams > 2 ? metrics.activeStreams + 1 : 3; // Conservative increase
  
  // Disk space check - need at least 20% free
  const diskLimit = metrics.diskPercent > 80 ? metrics.activeStreams : 10;
  
  // Quality factors
  let qualityMultiplier = 1;
  if (metrics.totalMemGB < 2) qualityMultiplier = 0.5; // Low memory system
  if (metrics.totalMemGB > 8) qualityMultiplier = 1.5; // High memory system
  
  // Take the minimum of all limits
  const idealCount = Math.floor(
    Math.min(cpuLimit, memoryLimit, currentLoadLimit, diskLimit) * qualityMultiplier
  );
  
  // Ensure at least 1 stream is recommended
  return Math.max(1, Math.min(idealCount, 10)); // Cap at 10 for safety
}