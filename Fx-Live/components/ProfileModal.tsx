import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useStudioSettings } from '@/lib/useStudioSettings';

interface ProfileModalProps {
  onClose: () => void;
}

const AVATAR_GRADIENTS = [
  { id: 'cyan', label: 'Cyber Cyan', class: 'from-[#00D4FF] to-[#7B61FF]', textColor: '#050B11' },
  { id: 'emerald', label: 'Broadcast Green', class: 'from-[#00E68A] to-[#00D4FF]', textColor: '#03140B' },
  { id: 'violet', label: 'Ultra Violet', class: 'from-[#7B61FF] to-[#FF61A6]', textColor: '#FFFFFF' },
  { id: 'amber', label: 'Amber Flame', class: 'from-[#FFB020] to-[#FF4757]', textColor: '#050B11' },
  { id: 'electric', label: 'Electric Rose', class: 'from-[#FF4757] to-[#7B61FF]', textColor: '#FFFFFF' },
];

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { settings, updateSetting } = useStudioSettings();
  const [operatorName, setOperatorName] = useState(settings.operatorName || 'Deepak Kumar');
  const [operatorRole, setOperatorRole] = useState(settings.operatorRole || 'Lead Broadcast Engineer');
  const [avatarColor, setAvatarColor] = useState(settings.operatorAvatarColor || 'from-[#00D4FF] to-[#7B61FF]');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'session'>('profile');

  useEffect(() => {
    setOperatorName(settings.operatorName);
    setOperatorRole(settings.operatorRole);
    setAvatarColor(settings.operatorAvatarColor);
  }, [settings]);

  // Extract initials
  const initials = operatorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'DK';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSetting('operatorName', operatorName.trim() || 'Deepak Kumar');
    updateSetting('operatorRole', operatorRole.trim() || 'Lead Broadcast Engineer');
    updateSetting('operatorAvatarColor', avatarColor);
    toast.success('Operator Profile updated successfully! 👤');
    onClose();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Send password update to endpoint
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Security password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden border border-white/10 shadow-glass-lg animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center bg-surface/80">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-mono shadow-md bg-gradient-to-br ${avatarColor}`}
              style={{ color: '#050B11' }}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E8ECF1]">{operatorName}</h2>
              <p className="text-xs text-[#7B8CA3]">{operatorRole}</p>
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

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] bg-surface/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'profile'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                : 'text-[#8B9BB4] hover:text-white'
            }`}
          >
            Operator Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'security'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                : 'text-[#8B9BB4] hover:text-white'
            }`}
          >
            Security & Credentials
          </button>
          <button
            onClick={() => setActiveTab('session')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'session'
                ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                : 'text-[#8B9BB4] hover:text-white'
            }`}
          >
            Session Info
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="fx-label">Operator Display Name</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="fx-input"
                  placeholder="e.g. Deepak Kumar"
                  required
                />
              </div>

              <div>
                <label className="fx-label">Professional Role / Title</label>
                <input
                  type="text"
                  value={operatorRole}
                  onChange={(e) => setOperatorRole(e.target.value)}
                  className="fx-input"
                  placeholder="e.g. Lead Broadcast Engineer"
                  required
                />
              </div>

              <div>
                <label className="fx-label mb-2">Avatar Theme Style</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {AVATAR_GRADIENTS.map((grad) => (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => setAvatarColor(grad.class)}
                      className={`h-11 rounded-xl bg-gradient-to-br ${grad.class} flex items-center justify-center font-mono font-bold text-xs transition-all active:scale-95 ${
                        avatarColor === grad.class
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B1118] scale-105 shadow-md'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ color: grad.textColor }}
                      title={grad.label}
                    >
                      {initials}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full fx-btn fx-btn-primary py-3 font-bold text-xs shadow-glow-sm"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="fx-label">Current Operator Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="fx-input"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="fx-label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="fx-input"
                  placeholder="Enter new password (min 6 chars)"
                  required
                />
              </div>

              <div>
                <label className="fx-label">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="fx-input"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full fx-btn fx-btn-primary py-3 font-bold text-xs shadow-glow-sm"
                >
                  {isChangingPassword ? 'Updating Password...' : 'Update Password Credentials'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'session' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-surface/60 border border-white/[0.06] space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-[#8B9BB4]">Session Status</span>
                  <span className="text-success font-semibold flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                    Authenticated & Active
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-[#8B9BB4]">Cookie Security</span>
                  <span className="text-[#00D4FF] font-mono">iron-session (AES-256)</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-[#8B9BB4]">Host Environment</span>
                  <span className="text-[#E8ECF1] font-mono">Local Standalone Instance</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#8B9BB4]">Permissions</span>
                  <span className="text-[#00E68A] font-semibold">Full Administrator</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
