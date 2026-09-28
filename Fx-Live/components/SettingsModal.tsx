import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStudioSettings, StudioSettings } from '@/lib/useStudioSettings';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSetting, updateAllSettings } = useStudioSettings();
  const [activeTab, setActiveTab] = useState<'appearance' | 'stream' | 'telemetry'>('appearance');

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'oled') => {
    updateSetting('theme', newTheme);
    toast.success(`Theme switched to ${newTheme.toUpperCase()}`, { icon: newTheme === 'light' ? '☀️' : '🌙' });
  };

  const handleReset = () => {
    if (confirm('Reset all studio preferences to default settings?')) {
      updateAllSettings({
        theme: 'dark',
        defaultQuality: '480p',
        defaultLoop: true,
        autoReconnect: true,
        soundAlerts: true,
        refreshInterval: 4000,
      });
      toast.success('Studio settings reset to defaults');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden border border-white/10 shadow-glass-lg animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center bg-surface/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E8ECF1]">Studio Settings & Preferences</h2>
              <p className="text-xs text-[#7B8CA3]">Customize theme, playback, and streaming parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B9BB4] hover:text-[#E8ECF1] hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="flex border-b border-white/[0.06] bg-surface/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'appearance'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                : 'text-[#8B9BB4] hover:text-white'
            }`}
          >
            Appearance & Themes
          </button>
          <button
            onClick={() => setActiveTab('stream')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'stream'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                : 'text-[#8B9BB4] hover:text-white'
            }`}
          >
            Streaming Defaults
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'telemetry'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                : 'text-[#8B9BB4] hover:text-white'
            }`}
          >
            Telemetry & Engine
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="fx-label mb-2">Interface Theme & Color Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Cyber Dark */}
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      settings.theme === 'dark'
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-glow-sm'
                        : 'border-white/[0.08] bg-surface/60 hover:border-white/20'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-[#0B1118] border border-[#00D4FF]/40 mb-2 flex items-center justify-center text-xs">
                      🌙
                    </div>
                    <div className="text-xs font-bold text-[#E8ECF1]">Cyber Dark</div>
                    <div className="text-[10px] text-[#7B8CA3] mt-0.5">Midnight Blue</div>
                  </button>

                  {/* Studio Light */}
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      settings.theme === 'light'
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-glow-sm'
                        : 'border-white/[0.08] bg-surface/60 hover:border-white/20'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-white border border-gray-300 mb-2 flex items-center justify-center text-xs text-amber-500">
                      ☀️
                    </div>
                    <div className="text-xs font-bold text-[#E8ECF1]">Studio Light</div>
                    <div className="text-[10px] text-[#7B8CA3] mt-0.5">Clean Day Mode</div>
                  </button>

                  {/* OLED Black */}
                  <button
                    type="button"
                    onClick={() => handleThemeChange('oled')}
                    className={`p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      settings.theme === 'oled'
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-glow-sm'
                        : 'border-white/[0.08] bg-surface/60 hover:border-white/20'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-black border border-white/20 mb-2 flex items-center justify-center text-xs text-white">
                      ⬛
                    </div>
                    <div className="text-xs font-bold text-[#E8ECF1]">OLED Black</div>
                    <div className="text-[10px] text-[#7B8CA3] mt-0.5">True Pitch Black</div>
                  </button>
                </div>
              </div>

              {/* Sound Notifications Toggle */}
              <div className="pt-2 border-t border-white/[0.06]">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-surface/50 border border-white/[0.06] cursor-pointer hover:border-white/12 transition-all">
                  <div>
                    <span className="text-xs font-bold text-[#E8ECF1]">Audible Broadcast Chimes</span>
                    <p className="text-[10px] text-[#7B8CA3]">Play subtle sound cue when stream starts or stops</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundAlerts}
                    onChange={(e) => updateSetting('soundAlerts', e.target.checked)}
                    className="fx-checkbox"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'stream' && (
            <div className="space-y-4">
              <div>
                <label className="fx-label">Default Broadcast Resolution & Bitrate</label>
                <select
                  value={settings.defaultQuality}
                  onChange={(e) => updateSetting('defaultQuality', e.target.value as any)}
                  className="fx-select"
                >
                  <option value="480p">⚡ 480p SD Eco (900 kbps) — Optimal for Slow Internet / Zero Buffering</option>
                  <option value="720p-low">🚀 720p HD Low-Bandwidth (1.4 Mbps) — Moderate Speeds</option>
                  <option value="360p">📶 360p Ultra-Low (500 kbps) — Minimal Speed</option>
                  <option value="720p">🎬 720p HD Standard (2.2 Mbps) — Balanced</option>
                  <option value="1080p">💎 1080p Full HD (3.8 Mbps) — High Speed Broadband</option>
                </select>
                <p className="text-[10px] text-[#7B8CA3] mt-1.5">
                  New stream creation forms will default to this network preset.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-surface/50 border border-white/[0.06] cursor-pointer hover:border-white/12 transition-all">
                  <div>
                    <span className="text-xs font-bold text-[#E8ECF1]">Default 24/7 Loop Enabled</span>
                    <p className="text-[10px] text-[#7B8CA3]">Pre-selects continuous loop on new broadcasts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.defaultLoop}
                    onChange={(e) => updateSetting('defaultLoop', e.target.checked)}
                    className="fx-checkbox"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-surface/50 border border-white/[0.06] cursor-pointer hover:border-white/12 transition-all">
                  <div>
                    <span className="text-xs font-bold text-[#E8ECF1]">Auto-Recovery on Drop</span>
                    <p className="text-[10px] text-[#7B8CA3]">Automatically reconnects socket on temporary network blips</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoReconnect}
                    onChange={(e) => updateSetting('autoReconnect', e.target.checked)}
                    className="fx-checkbox"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <div>
                <label className="fx-label">Dashboard Telemetry Polling Rate</label>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                  className="fx-select"
                >
                  <option value={2000}>⚡ Real-Time Fast (Every 2 seconds)</option>
                  <option value={4000}>⚖️ Balanced Standard (Every 4 seconds)</option>
                  <option value={8000}>🌱 Low Resource / Battery Saver (Every 8 seconds)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-surface/60 border border-white/[0.06] text-xs space-y-2">
                <span className="text-xs font-bold text-[#E8ECF1]">Local Storage & Cache</span>
                <p className="text-[11px] text-[#7B8CA3]">
                  Flush local cache and reset user parameters back to factory settings.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="fx-btn fx-btn-secondary py-2 text-xs font-bold w-full"
                >
                  Reset Studio Preferences
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] bg-surface/80 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="fx-btn fx-btn-primary py-2 px-5 text-xs font-bold shadow-glow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
