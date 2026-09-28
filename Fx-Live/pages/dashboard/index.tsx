import { useState, useEffect } from 'react';
import { getSession } from '@/lib/auth';
import { GetServerSidePropsContext } from 'next';
import axios from 'axios';
import Link from 'next/link';
import Layout from '@/components/Layout';
import dayjs from 'dayjs';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: 'cyan' | 'violet' | 'green' | 'amber' | 'red' | 'blue' | 'pink';
  showProgress?: boolean;
  progress?: number;
  icon?: React.ReactNode;
  trend?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const colorMap: Record<string, { accent: string; glow: string; bg: string; border: string }> = {
  cyan:   { accent: '#00D4FF', glow: 'rgba(0, 212, 255, 0.25)', bg: 'rgba(0, 212, 255, 0.08)', border: 'rgba(0, 212, 255, 0.25)' },
  violet: { accent: '#7B61FF', glow: 'rgba(123, 97, 255, 0.25)', bg: 'rgba(123, 97, 255, 0.08)', border: 'rgba(123, 97, 255, 0.25)' },
  green:  { accent: '#00E68A', glow: 'rgba(0, 230, 138, 0.25)', bg: 'rgba(0, 230, 138, 0.08)', border: 'rgba(0, 230, 138, 0.25)' },
  amber:  { accent: '#FFB020', glow: 'rgba(255, 176, 32, 0.25)', bg: 'rgba(255, 176, 32, 0.08)', border: 'rgba(255, 176, 32, 0.25)' },
  red:    { accent: '#FF4757', glow: 'rgba(255, 71, 87, 0.25)', bg: 'rgba(255, 71, 87, 0.08)', border: 'rgba(255, 71, 87, 0.25)' },
  blue:   { accent: '#4D8EFF', glow: 'rgba(77, 142, 255, 0.25)', bg: 'rgba(77, 142, 255, 0.08)', border: 'rgba(77, 142, 255, 0.25)' },
  pink:   { accent: '#FF61A6', glow: 'rgba(255, 97, 166, 0.25)', bg: 'rgba(255, 97, 166, 0.08)', border: 'rgba(255, 97, 166, 0.25)' },
};

const MetricCard = ({ title, value, subtitle, color, showProgress, progress, icon, trend }: MetricCardProps) => {
  const c = colorMap[color] || colorMap.cyan;

  return (
    <div className="glass-card p-4 transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
      {/* Top subtle highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all" />
      
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7B8CA3]">
          {title}
        </span>
        {icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2 mb-1.5">
        <div className="text-xl font-bold font-mono text-[#E8ECF1] tabular-nums tracking-tight">
          {value}
        </div>
        {trend && (
          <span className="text-[10px] font-semibold text-success font-mono">
            {trend}
          </span>
        )}
      </div>

      {showProgress && progress !== undefined && (
        <div className="fx-progress mb-2 h-1.5">
          <div
            className="fx-progress-bar"
            style={{ 
              width: `${Math.min(progress, 100)}%`, 
              background: `linear-gradient(90deg, ${c.accent}, #00E68A)`,
              boxShadow: `0 0 8px ${c.glow}`,
            }}
          />
        </div>
      )}
      
      <div className="text-[11px] text-[#8B9BB4] flex justify-between items-center">
        <span>{subtitle}</span>
        {showProgress && progress !== undefined && (
          <span className="font-mono text-[10px] text-[#52637A] tabular-nums">{Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
};

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

interface DashboardData {
  videoCount: number;
  streamCount: number;
  activeStreamCount: number;
  recentActivity: any[];
}

interface SystemStats {
  systemCpu: number;
  amsCpu: number;
  dbAvgQueryTime: number;
  activeStreams: number;
  idealStreams: number;
  disk: {
    used: number;
    total: number;
    percent: number;
    usedFormatted: string;
    totalFormatted: string;
  };
  memory: {
    used: number;
    total: number;
    percent: number;
    usedFormatted: string;
    totalFormatted: string;
  };
  heap: {
    used: number;
    total: number;
    percent: number;
    usedFormatted: string;
    totalFormatted: string;
  };
}

interface StreamStatsData {
  averages: {
    avgBitrate: number;
    avgFps: number;
    avgSpeed: number;
    totalDataTransferred: number;
    totalDroppedFrames: number;
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
    problemStreams: number[];
  };
  summary: {
    totalStreams: number;
    excellentStreams: number;
    goodStreams: number;
    fairStreams: number;
    poorStreams: number;
    streamsWithErrors: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    videoCount: 0,
    streamCount: 0,
    activeStreamCount: 0,
    recentActivity: [],
  });
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchSystemStats();
    fetchStreamStats();
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchSystemStats();
      fetchStreamStats();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [videosRes, streamsRes, statusRes] = await Promise.all([
        axios.get('/api/videos/list'),
        axios.get('/api/streams/list'),
        axios.get('/api/streams/dashboard-status'),
      ]);

      setData({
        videoCount: videosRes.data.videos?.length || 0,
        streamCount: streamsRes.data.streams?.length || 0,
        activeStreamCount: statusRes.data.activeCount || 0,
        recentActivity: [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await axios.get('/api/system/stats');
      setSystemStats(response.data);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const fetchStreamStats = async () => {
    try {
      const response = await axios.get('/api/streams/stats');
      setStreamStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stream stats:', error);
    }
  };

  const qualityColorMap: Record<string, string> = {
    excellent: '#00E68A',
    good: '#00D4FF',
    fair: '#FFB020',
    poor: '#FF4757',
  };

  return (
    <Layout>
      <div className="p-5 sm:p-7 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[#E8ECF1]">
                Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25 font-mono">
                TELEMETRY ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#7B8CA3] mt-1">
              Real-time RTMP ingestion pipelines, FFmpeg transcoders, and system performance
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link href="/streams">
              <button className="fx-btn fx-btn-primary shadow-glow-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Stream Pipeline</span>
              </button>
            </Link>
            <Link href="/videos">
              <button className="fx-btn fx-btn-secondary">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Import Video</span>
              </button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#8B9BB4] font-medium">Connecting to broadcast daemon...</span>
            </div>
          </div>
        ) : (
          <>
            {/* ─── Top Level Primary Stat Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Videos */}
              <Link href="/videos" className="block group">
                <div className="glass-card p-5 transition-all duration-200 group-hover:border-[#00D4FF]/30 group-hover:shadow-glow-sm relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7B8CA3]">
                        Video Library Assets
                      </p>
                      <p className="text-3xl font-extrabold font-mono text-[#E8ECF1] mt-1 tabular-nums">
                        {data.videoCount}
                      </p>
                      <p className="text-[11px] text-[#8B9BB4] mt-1 group-hover:text-[#00D4FF] transition-colors flex items-center">
                        <span>Manage assets</span>
                        <svg className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00D4FF]/10 border border-[#00D4FF]/20 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-[#00D4FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Total Pipelines */}
              <Link href="/streams" className="block group">
                <div className="glass-card p-5 transition-all duration-200 group-hover:border-[#7B61FF]/30 group-hover:shadow-glow-violet relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7B8CA3]">
                        Configured Channels
                      </p>
                      <p className="text-3xl font-extrabold font-mono text-[#E8ECF1] mt-1 tabular-nums">
                        {data.streamCount}
                      </p>
                      <p className="text-[11px] text-[#8B9BB4] mt-1 group-hover:text-[#7B61FF] transition-colors flex items-center">
                        <span>View pipelines</span>
                        <svg className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#7B61FF]/10 border border-[#7B61FF]/20 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-[#7B61FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Live Active Streams */}
              <Link href="/streams" className="block group">
                <div className={`glass-card p-5 transition-all duration-200 relative ${
                  data.activeStreamCount > 0 ? 'border-success/30 hover:shadow-glow' : 'hover:border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7B8CA3]">
                          Live 24/7 Broadcasts
                        </p>
                        {data.activeStreamCount > 0 && (
                          <span className="status-dot status-dot-running" />
                        )}
                      </div>
                      <p className="text-3xl font-extrabold font-mono text-[#00E68A] mt-1 tabular-nums">
                        {data.activeStreamCount}
                      </p>
                      <p className="text-[11px] text-[#8B9BB4] mt-1">
                        {systemStats ? `Optimal Capacity: ${systemStats.idealStreams} Streams` : 'Ready to ingest'}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-success/10 border border-success/20 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* ─── System Hardware & Runtime Telemetry ─── */}
            {systemStats && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="fx-section-title">Hardware Telemetry & Resource Engine</h2>
                  <span className="text-[10px] font-mono text-[#52637A]">POLL INTERVAL: 4s</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <MetricCard
                    title="Host CPU"
                    value={`${systemStats.systemCpu}%`}
                    subtitle="System usage"
                    color="cyan"
                    showProgress={true}
                    progress={systemStats.systemCpu}
                    icon={
                      <svg className="w-3.5 h-3.5 text-[#00D4FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    }
                  />
                  <MetricCard
                    title="App CPU"
                    value={`${systemStats.amsCpu}%`}
                    subtitle="FFmpeg engine"
                    color="violet"
                    showProgress={true}
                    progress={systemStats.amsCpu}
                    icon={
                      <svg className="w-3.5 h-3.5 text-[#7B61FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    }
                  />
                  <MetricCard
                    title="DB Latency"
                    value={`${systemStats.dbAvgQueryTime}ms`}
                    subtitle="SQLite query"
                    color="green"
                    icon={
                      <svg className="w-3.5 h-3.5 text-[#00E68A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    }
                  />
                  <MetricCard
                    title="RAM Used"
                    value={`${systemStats.memory.percent}%`}
                    subtitle={systemStats.memory.usedFormatted}
                    color="blue"
                    showProgress={true}
                    progress={systemStats.memory.percent}
                  />
                  <MetricCard
                    title="Heap RAM"
                    value={`${systemStats.heap.percent}%`}
                    subtitle={systemStats.heap.usedFormatted}
                    color="pink"
                    showProgress={true}
                    progress={systemStats.heap.percent}
                  />
                  <MetricCard
                    title="Disk Storage"
                    value={`${systemStats.disk.percent}%`}
                    subtitle={systemStats.disk.usedFormatted}
                    color="red"
                    showProgress={true}
                    progress={systemStats.disk.percent}
                  />
                  <MetricCard
                    title="Load Factor"
                    value={`${Math.round((data.activeStreamCount / (systemStats.idealStreams || 1)) * 100)}%`}
                    subtitle={`${data.activeStreamCount}/${systemStats.idealStreams} Max`}
                    color="amber"
                    showProgress={true}
                    progress={Math.round((data.activeStreamCount / (systemStats.idealStreams || 1)) * 100)}
                  />
                </div>
              </div>
            )}

            {/* ─── Stream Health Matrix (When streams are active) ─── */}
            {streamStats && data.activeStreamCount > 0 && (
              <div className="glass-card-static p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="status-dot status-dot-running" />
                    <h2 className="text-sm font-bold text-[#E8ECF1]">Live Stream Real-Time Telemetry</h2>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/30 font-mono font-medium">
                    QUALITY: {streamStats.averages.overallQuality.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface/60 border border-white/[0.05]">
                    <span className="text-[10px] font-bold uppercase text-[#7B8CA3]">Avg Bitrate</span>
                    <p className="text-lg font-bold font-mono text-[#00D4FF] mt-0.5 tabular-nums">
                      {Math.round(streamStats.averages.avgBitrate)} <span className="text-xs font-normal text-[#8B9BB4]">kbps</span>
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface/60 border border-white/[0.05]">
                    <span className="text-[10px] font-bold uppercase text-[#7B8CA3]">Avg Frame Rate</span>
                    <p className="text-lg font-bold font-mono text-[#E8ECF1] mt-0.5 tabular-nums">
                      {streamStats.averages.avgFps.toFixed(1)} <span className="text-xs font-normal text-[#8B9BB4]">FPS</span>
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface/60 border border-white/[0.05]">
                    <span className="text-[10px] font-bold uppercase text-[#7B8CA3]">Transcode Speed</span>
                    <p className="text-lg font-bold font-mono text-[#00E68A] mt-0.5 tabular-nums">
                      {streamStats.averages.avgSpeed.toFixed(2)}x
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface/60 border border-white/[0.05]">
                    <span className="text-[10px] font-bold uppercase text-[#7B8CA3]">Data Transferred</span>
                    <p className="text-lg font-bold font-mono text-[#7B61FF] mt-0.5 tabular-nums">
                      {formatBytes(streamStats.averages.totalDataTransferred)}
                    </p>
                  </div>
                </div>

                {/* Stream Problem Alerts if any */}
                {streamStats.averages.problemStreams.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center space-x-3 text-xs text-amber-300">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      Stream pipelines #{streamStats.averages.problemStreams.join(', #')} are experiencing low bitrate or frame drops.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ─── Bottom Actions & System Health Overview ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Launchpad */}
              <div className="glass-card-static p-5 space-y-3.5">
                <h2 className="fx-section-title">Studio Launchpad</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Link href="/videos">
                    <button className="w-full p-3.5 rounded-xl bg-surface/60 border border-white/[0.06] hover:border-[#00D4FF]/30 hover:bg-surface transition-all text-left group active:scale-[0.98]">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#E8ECF1] group-hover:text-[#00D4FF] transition-colors">
                            Upload Video
                          </div>
                          <div className="text-[10px] text-[#7B8CA3]">Local disk or Drive</div>
                        </div>
                      </div>
                    </button>
                  </Link>

                  <Link href="/streams">
                    <button className="w-full p-3.5 rounded-xl bg-surface/60 border border-white/[0.06] hover:border-[#7B61FF]/30 hover:bg-surface transition-all text-left group active:scale-[0.98]">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#7B61FF]/10 text-[#7B61FF] flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#E8ECF1] group-hover:text-[#7B61FF] transition-colors">
                            Start Broadcast
                          </div>
                          <div className="text-[10px] text-[#7B8CA3]">YouTube 24/7 RTMP</div>
                        </div>
                      </div>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Status Overview Card */}
              <div className="glass-card-static p-5 space-y-3">
                <h2 className="fx-section-title">Engine Reliability</h2>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-[#8B9BB4]">FFmpeg Process Handler</span>
                    <span className="flex items-center text-success font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                      Active & Resilient
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-[#8B9BB4]">Continuous Loop Engine</span>
                    <span className="text-[#00D4FF] font-medium font-mono">24/7 Seamless</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-[#8B9BB4]">Ingest Protocol</span>
                    <span className="text-[#E8ECF1] font-mono">RTMP / RTMPS Multi-codec</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}