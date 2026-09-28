import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function killFFmpegProcess(streamId: number): Promise<void> {
  try {
    // Find all ffmpeg processes
    const { stdout } = await execAsync('ps aux | grep ffmpeg | grep -v grep');
    const processes = stdout.split('\n').filter(line => line.trim());
    
    console.log(`Found ${processes.length} FFmpeg processes`);
    
    // Kill all ffmpeg processes (brute force for Docker)
    for (const processLine of processes) {
      const parts = processLine.split(/\s+/);
      const pid = parts[1];
      
      if (pid) {
        try {
          await execAsync(`kill -9 ${pid}`);
          console.log(`Killed FFmpeg process ${pid}`);
        } catch (e) {
          console.error(`Failed to kill process ${pid}:`, e);
        }
      }
    }
  } catch (error) {
    // No ffmpeg processes found or error
    console.log('No FFmpeg processes found or error:', error);
  }
}

export async function killAllFFmpegProcesses(): Promise<void> {
  try {
    // Nuclear option - kill all ffmpeg processes
    await execAsync('pkill -9 ffmpeg');
    console.log('Killed all FFmpeg processes');
  } catch (error) {
    // pkill returns error if no processes found
    console.log('No FFmpeg processes to kill');
  }
}