import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from '@/lib/auth';
import { GetServerSidePropsContext } from 'next';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import StreamCard from '@/components/StreamCard';
import StreamForm from '@/components/StreamForm';

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context.req, context.res);
  if (!session.user?.isLoggedIn) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }
  return {
    props: {
      user: session.user,
    },
  };
};

interface Stream {
  id: number;
  name: string;
  video_id: number;
  video_name: string;
  rtmp_url: string;
  quality: string;
  loop_enabled: boolean;
  status: 'running' | 'stopped' | 'error';
  started_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface StreamLimits {
  maxConcurrentStreams: number;
  activeStreams: number;
  canStartMore: boolean;
  remainingSlots: number;
}

export default function StreamsPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [limits, setLimits] = useState<StreamLimits>({
    maxConcurrentStreams: 10,
    activeStreams: 0,
    canStartMore: true,
    remainingSlots: 10,
  });
  const selectedVideoId = router.query.videoId as string | undefined;

  const fetchStreams = async () => {
    try {
      const [streamsRes, limitsRes] = await Promise.all([
        axios.get('/api/streams/list'),
        axios.get('/api/streams/limits'),
      ]);
      setStreams(streamsRes.data.streams || []);
      setLimits(limitsRes.data);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await axios.post('/api/streams/sync-status', {});
      toast.success('FFmpeg processes and database synchronized');
      fetchStreams();
    } catch (error) {
      toast.error('Failed to sync status');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCleanup = async () => {
    try {
      const response = await axios.post('/api/streams/cleanup', {});
      toast.success(response.data.message || 'Cleanup completed');
      fetchStreams();
    } catch (error) {
      toast.error('Failed to cleanup duplicate streams');
    }
  };

  const handleForceStop = async () => {
    if (confirm('Emergency Stop: Terminate ALL active FFmpeg streaming processes immediately?')) {
      try {
        await axios.post('/api/streams/force-stop', {});
        toast.success('All live stream processes terminated');
        fetchStreams();
      } catch (error) {
        toast.error('Failed to force stop streams');
      }
    }
  };

  const activeCount = streams.filter(s => s.status === 'running').length;
  const atCapacity = !limits.canStartMore;

  return (
    <Layout>
      <div className="p-5 sm:p-7 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
              <h1 className="text-xl font-bold tracking-tight text-[#E8ECF1]">
                Stream Management
              </h1>
              {activeCount > 0 && (
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/30 font-mono">
                  <span className="status-dot status-dot-running" />
                  <span>{activeCount} ACTIVE</span>
                </span>
              )}
              {/* Capacity Badge */}
              <span className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
                atCapacity
                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                  : limits.remainingSlots <= 2
                  ? 'bg-warning/10 text-warning border-warning/30'
                  : 'bg-white/[0.04] text-[#8B9BB4] border-white/[0.08]'
              }`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>{limits.activeStreams}/{limits.maxConcurrentStreams} SLOTS</span>
              </span>
            </div>
            <p className="text-xs text-[#7B8CA3] mt-1">
              Configure, monitor, and control 24/7 RTMP video streaming pipelines
            </p>
          </div>

          {/* Precision Action Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="fx-btn fx-btn-secondary text-xs"
              title="Synchronize system processes with DB state"
            >
              <svg className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-[#00D4FF]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync Engine</span>
            </button>

            <button
              onClick={handleCleanup}
              className="fx-btn fx-btn-secondary text-xs"
              title="Clean orphan processes and duplicates"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clean</span>
            </button>

            <button
              onClick={handleForceStop}
              className="fx-btn fx-btn-danger text-xs font-semibold"
              title="Emergency: Kill all FFmpeg streams"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              <span>Emergency Stop</span>
            </button>
          </div>
        </div>

        {/* Capacity Warning Banner */}
        {atCapacity && (
          <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-destructive/[0.08] border border-destructive/25 animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-destructive">Maximum Concurrent Streams Reached</p>
              <p className="text-[11px] text-destructive/80">
                All {limits.maxConcurrentStreams} stream slots are in use. Stop an existing broadcast to free up a slot before starting a new one.
              </p>
            </div>
          </div>
        )}

        {/* Near-Capacity Warning Banner */}
        {!atCapacity && limits.remainingSlots <= 2 && limits.remainingSlots > 0 && (
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-warning/[0.06] border border-warning/20 animate-fade-in">
            <svg className="w-4 h-4 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-[11px] text-warning">
              <span className="font-bold">Nearly at capacity:</span> Only {limits.remainingSlots} stream {limits.remainingSlots === 1 ? 'slot' : 'slots'} remaining out of {limits.maxConcurrentStreams}.
            </p>
          </div>
        )}

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Form Column (4 cols on lg) */}
          <div className="lg:col-span-5">
            <div className="glass-card-static p-5 space-y-4 sticky top-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-[#E8ECF1]">New Broadcast Pipeline</h2>
                </div>
                <span className="text-[10px] font-mono text-[#7B8CA3]">RTMP PROTOCOL</span>
              </div>
              <StreamForm onSuccess={fetchStreams} initialVideoId={selectedVideoId} />
            </div>
          </div>

          {/* Stream Pipelines List (7 cols on lg) */}
          <div className="lg:col-span-7">
            <div className="glass-card-static p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-[#7B61FF]/10 text-[#7B61FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-[#E8ECF1]">Active & Configured Pipelines</h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-white/[0.04] text-[#8B9BB4] border border-white/[0.06]">
                  {streams.length} total
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-7 h-7 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[#8B9BB4]">Querying stream pipelines...</span>
                  </div>
                </div>
              ) : streams.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 bg-surface border border-white/[0.06]">
                    <svg className="w-7 h-7 text-[#52637A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-[#E8ECF1] mb-1">No streaming pipelines yet</h3>
                  <p className="text-xs text-[#7B8CA3] max-w-sm mx-auto">
                    Configure your first YouTube or Custom RTMP stream using the pipeline builder on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {streams.map((stream) => (
                    <StreamCard 
                      key={stream.id} 
                      stream={stream} 
                      onUpdate={fetchStreams}
                      canStartMore={limits.canStartMore}
                      maxStreams={limits.maxConcurrentStreams}
                      activeStreamCount={limits.activeStreams}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}