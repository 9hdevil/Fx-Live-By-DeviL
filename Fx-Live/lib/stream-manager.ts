// Global stream tracking that persists across requests
const activeStreams = new Map<number, { 
  streamId: number;
  startTime: Date;
  status: 'running' | 'stopped' | 'error';
}>();

export function registerStream(streamId: number) {
  activeStreams.set(streamId, {
    streamId,
    startTime: new Date(),
    status: 'running'
  });
}

export function unregisterStream(streamId: number) {
  activeStreams.delete(streamId);
}

export function getStreamStatus(streamId: number) {
  return activeStreams.get(streamId);
}

export function getAllActiveStreams() {
  return Array.from(activeStreams.values());
}