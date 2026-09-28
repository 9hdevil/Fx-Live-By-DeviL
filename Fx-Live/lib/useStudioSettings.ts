import { useState, useEffect } from 'react';

export interface StudioSettings {
  theme: 'dark' | 'light' | 'oled';
  defaultQuality: '360p' | '480p' | '720p-low' | '720p' | '1080p';
  defaultLoop: boolean;
  autoReconnect: boolean;
  soundAlerts: boolean;
  refreshInterval: number; // in milliseconds
  operatorName: string;
  operatorRole: string;
  operatorAvatarColor: string;
}

const DEFAULT_SETTINGS: StudioSettings = {
  theme: 'dark',
  defaultQuality: '480p',
  defaultLoop: true,
  autoReconnect: true,
  soundAlerts: true,
  refreshInterval: 4000,
  operatorName: 'Deepak Kumar',
  operatorRole: 'Lead Broadcast Engineer',
  operatorAvatarColor: 'from-[#00D4FF] to-[#7B61FF]',
};

const SETTINGS_KEY = 'fx_live_studio_settings_v1';

export function getStoredSettings(): StudioSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {}
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: StudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyThemeClass(settings.theme);
    window.dispatchEvent(new Event('fx_settings_updated'));
  } catch (e) {}
}

export function applyThemeClass(theme: 'dark' | 'light' | 'oled'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light', 'oled');
  if (theme === 'light') {
    root.classList.add('light');
  } else if (theme === 'oled') {
    root.classList.add('dark', 'oled');
  } else {
    root.classList.add('dark');
  }
}

export function useStudioSettings() {
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const initial = getStoredSettings();
    setSettings(initial);
    applyThemeClass(initial.theme);

    const handleUpdate = () => {
      const updated = getStoredSettings();
      setSettings(updated);
      applyThemeClass(updated.theme);
    };

    window.addEventListener('fx_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('fx_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateSetting = <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveStoredSettings(next);
  };

  const updateAllSettings = (newSettings: Partial<StudioSettings>) => {
    const next = { ...settings, ...newSettings };
    setSettings(next);
    saveStoredSettings(next);
  };

  return {
    settings,
    updateSetting,
    updateAllSettings,
  };
}
