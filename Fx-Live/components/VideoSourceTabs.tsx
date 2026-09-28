import { useState } from 'react';
import VideoUpload from './VideoUpload';
import GoogleDriveTab from './GoogleDriveTab';
import DriveLinkTab from './DriveLinkTab';

interface VideoSourceTabsProps {
  onImportComplete: () => void;
}

type TabId = 'link' | 'local' | 'drive';

interface Tab {
  id: TabId;
  label: string;
  badge?: string;
  icon: JSX.Element;
}

const tabs: Tab[] = [
  {
    id: 'link',
    label: 'Google Drive Direct Link',
    badge: 'Zero Login Required',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'local',
    label: 'Local File Upload',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    id: 'drive',
    label: 'Google Drive Account',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.71 3.5L1.15 15l3.43 5.96h6.6L4.62 9.46 7.71 3.5zm1.14 0l6.56 11.5H21.97L15.41 3.5H8.85zm7.71 12.5H9.99l-3.43 5.96h6.57l3.43-5.96z" />
      </svg>
    ),
  },
];

export default function VideoSourceTabs({ onImportComplete }: VideoSourceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('link');

  return (
    <div className="space-y-4">
      {/* Precision Segmented Control Tab Bar */}
      <div className="flex space-x-1 p-1 rounded-xl bg-surface/80 border border-white/[0.06]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 flex-1 relative ${
                isActive
                  ? 'bg-gradient-to-b from-[#00D4FF]/20 to-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 shadow-glow-sm'
                  : 'text-[#8B9BB4] hover:text-[#E8ECF1] hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`hidden md:inline-block text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-[#00D4FF]/25 text-[#00D4FF]'
                      : 'bg-white/[0.06] text-[#7B8CA3]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="animate-fade-in p-1">
        {activeTab === 'link' && (
          <DriveLinkTab onImportComplete={onImportComplete} />
        )}
        {activeTab === 'local' && (
          <VideoUpload onUploadComplete={onImportComplete} />
        )}
        {activeTab === 'drive' && (
          <GoogleDriveTab onImportComplete={onImportComplete} />
        )}
      </div>
    </div>
  );
}
