import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import SettingsModal from './SettingsModal';
import ProfileModal from './ProfileModal';
import { useStudioSettings } from '@/lib/useStudioSettings';

interface LayoutProps {
  children: ReactNode;
}

// Crisp studio SVG icons - larger 20px size
const DashboardIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
  </svg>
);

const VideosIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

const StreamsIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
  </svg>
);

const EditorIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const CaptionsIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const AudioIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', shortcut: '1', icon: DashboardIcon },
  { href: '/videos', label: 'Video Library', shortcut: '2', icon: VideosIcon },
  { href: '/streams', label: 'Live Streams', shortcut: '3', icon: StreamsIcon },
  { href: '#', label: 'Video Editor', icon: EditorIcon, disabled: true },
  { href: '#', label: 'Subtitles & Captions', icon: CaptionsIcon, disabled: true },
  { href: '#', label: 'Audio Engine', icon: AudioIcon, disabled: true },
];

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/dashboard': return { title: 'Dashboard', subtitle: 'Live Telemetry & Health' };
    case '/videos': return { title: 'Video Library', subtitle: 'Asset & Cloud Storage' };
    case '/streams': return { title: 'Stream Management', subtitle: '24/7 RTMP Pipelines' };
    default: return { title: 'Workspace', subtitle: 'Broadcast Studio' };
  }
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { settings } = useStudioSettings();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeStreamCount, setActiveStreamCount] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    setCurrentTime(dayjs().format('HH:mm:ss'));
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/streams/dashboard-status');
        setActiveStreamCount(res.data.activeCount || 0);
      } catch (err) {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, settings.refreshInterval || 4000);
    return () => clearInterval(interval);
  }, [settings.refreshInterval]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      router.push('/auth/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const pageInfo = getPageTitle(router.pathname);

  // Extract Initials
  const initials = (settings.operatorName || 'Deepak Kumar')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={{ background: '#0B1118' }}>
      {/* ─── Top Studio Command Header (64px Height) ─── */}
      <header
        className="flex-none h-16 flex items-center justify-between px-5 sm:px-6 relative z-30"
        style={{
          background: 'rgba(11, 17, 24, 0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Left — Brand + Suite badge */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            {/* Tactile Brand Icon - Larger 38px */}
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-transform duration-200 group-hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(123, 97, 255, 0.18) 100%)',
                border: '1px solid rgba(0, 212, 255, 0.4)',
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.25)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold tracking-tight text-[#E8ECF1]">
                  Fx Live <span className="text-[#00D4FF]">24/7</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30">
                  PRO
                </span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#7B8CA3]">
                BROADCAST SUITE
              </span>
            </div>
          </Link>
        </div>

        {/* Center — Current Location / Breadcrumb */}
        <div className="hidden md:flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-glow-sm" />
          <span className="text-sm font-bold text-[#E8ECF1]">
            {pageInfo.title}
          </span>
          <span className="text-sm text-[#52637A] font-light">/</span>
          <span className="text-xs text-[#8B9BB4] font-medium">
            {pageInfo.subtitle}
          </span>
        </div>

        {/* Right — Live Status Pill + Settings Trigger + Profile */}
        <div className="flex items-center space-x-3.5">
          {/* Active Broadcast Indicator */}
          {activeStreamCount > 0 ? (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-success/15 border border-success/35 text-success text-xs font-bold">
              <span className="status-dot status-dot-running" />
              <span>{activeStreamCount} {activeStreamCount === 1 ? 'STREAM LIVE' : 'STREAMS LIVE'}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] text-[#8B9BB4] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Engine Standby</span>
            </div>
          )}

          {/* Precision Digital Clock */}
          <div className="hidden sm:flex items-center px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-[#E8ECF1] tabular-nums font-semibold">
            <svg className="w-4 h-4 mr-1.5 text-[#00D4FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Quick Settings Icon Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#8B9BB4] hover:text-[#00D4FF] transition-all duration-150 active:scale-95"
            title="Studio Settings & Themes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <div className="w-px h-6 bg-white/[0.08]" />

          {/* Profile Avatar Trigger Button */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group"
            title="Open Operator Profile"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono text-[#050B11] shadow-md bg-gradient-to-br ${settings.operatorAvatarColor || 'from-[#00D4FF] to-[#7B61FF]'} group-hover:scale-105 transition-transform`}
            >
              {initials}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-[#E8ECF1] group-hover:text-[#00D4FF] transition-colors">
                {settings.operatorName || 'Deepak Kumar'}
              </span>
              <span className="text-[10px] text-[#7B8CA3] leading-none">
                Profile & Security
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* ─── Main Workspace: Sidebar + Content ─── */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* ─── Sidebar Navigation (Width 270px) ─── */}
        <aside
          className="flex-none w-[270px] flex flex-col py-4 px-3"
          style={{
            background: 'rgba(11, 17, 24, 0.75)',
            backdropFilter: 'blur(16px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          {/* Navigation Title */}
          <div className="px-3 mb-3 flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-[#7B8CA3]">
              NAVIGATION
            </span>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              const isHovered = hoveredItem === item.label;
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className="relative flex items-center justify-between px-3.5 py-3 rounded-xl cursor-not-allowed group transition-colors"
                    onMouseEnter={() => setHoveredItem(item.label)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{ opacity: 0.45 }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-[#6B7D95]"><Icon /></span>
                      <span className="text-sm font-semibold text-[#6B7D95]">{item.label}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-white/[0.04] text-[#6B7D95]">
                      Soon
                    </span>
                    {isHovered && (
                      <div className="fx-tooltip left-full ml-2 top-1/2 -translate-y-1/2">
                        Module in development
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link key={item.label} href={item.href}>
                  <div
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#00D4FF]/[0.12] text-[#FFFFFF] border border-[#00D4FF]/40 shadow-glow'
                        : 'text-[#8B9BB4] hover:text-[#FFFFFF] hover:bg-white/[0.05] border border-transparent active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={isActive ? 'text-[#00D4FF]' : 'text-[#7B8CA3]'}>
                        <Icon />
                      </span>
                      <span className="text-sm font-bold tracking-tight">
                        {item.label}
                      </span>
                    </div>
                    {item.shortcut && (
                      <kbd
                        className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                          isActive
                            ? 'bg-[#00D4FF]/25 text-[#00D4FF] border border-[#00D4FF]/30'
                            : 'bg-white/[0.05] text-[#7B8CA3] border border-white/[0.04]'
                        }`}
                      >
                        ⌘{item.shortcut}
                      </kbd>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick System Action Section */}
          <div className="my-3 mx-2 border-t border-white/[0.07]" />

          <div className="space-y-1.5">
            {/* Settings Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#8B9BB4] hover:text-[#FFFFFF] hover:bg-white/[0.05] transition-all duration-150 active:scale-[0.98]"
            >
              <span className="text-[#7B8CA3]"><SettingsIcon /></span>
              <span>Settings</span>
            </button>

            {/* Profile Trigger */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#8B9BB4] hover:text-[#FFFFFF] hover:bg-white/[0.05] transition-all duration-150 active:scale-[0.98]"
            >
              <span className="text-[#7B8CA3]">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <span>Profile & Security</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#FF6675] hover:text-[#FF8591] hover:bg-[#FF4757]/[0.1] transition-all duration-150 active:scale-[0.98]"
            >
              <span className="text-[#FF6675]"><LogoutIcon /></span>
              <span>Sign Out</span>
            </button>
          </div>

          {/* Footer Engine Status */}
          <div className="mt-3 mx-1 p-3 rounded-xl bg-surface/70 border border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#E8ECF1] font-bold">Engine v1.0.4</span>
            </div>
            <span className="text-[#7B8CA3] font-mono text-[11px] font-semibold">STANDALONE</span>
          </div>
        </aside>

        {/* ─── Main Content Viewport ─── */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#0B1118' }}>
          <div className="animate-fade-in max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Settings Modal Popup */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Profile Modal Popup */}
      {isProfileOpen && (
        <ProfileModal onClose={() => setIsProfileOpen(false)} />
      )}
    </div>
  );
}