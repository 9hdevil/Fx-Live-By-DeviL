import { useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSidePropsContext } from 'next';
import { getSession } from '@/lib/auth';
import axios from 'axios';
import toast from 'react-hot-toast';

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context.req, context.res);
  if (session.user?.isLoggedIn) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }
  return {
    props: {},
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post('/api/auth/login', { username, password });
      toast.success('Authentication successful! Welcome to Fx Live');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Invalid credentials. Please verify username and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 select-none"
      style={{ background: '#070C12' }}
    >
      {/* Ambient studio glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.06) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(123, 97, 255, 0.045) 0%, transparent 65%)' }}
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(123, 97, 255, 0.12) 100%)',
              border: '1px solid rgba(0, 212, 255, 0.35)',
              boxShadow: '0 0 32px rgba(0, 212, 255, 0.2)',
            }}
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#E8ECF1]">
            Fx Live <span className="text-[#00D4FF]">24/7</span>
          </h1>
          <p className="text-xs mt-1.5 font-medium tracking-wider uppercase text-[#7B8CA3]">
            Professional Broadcast & Streaming Suite
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card-static p-7 shadow-glass-lg border-white/[0.08]">
          <div className="mb-5 pb-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-[#E8ECF1]">
              Sign in to Studio Console
            </h2>
            <p className="text-[11px] text-[#7B8CA3] mt-0.5">
              Enter your operator credentials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="fx-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="fx-input"
                placeholder="Enter operator username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="fx-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="fx-input pr-10"
                  placeholder="Enter secret password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7B8CA3] hover:text-[#00D4FF] transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full fx-btn fx-btn-primary py-3 font-bold text-xs shadow-glow-sm mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </span>
              ) : (
                <span>Authenticate & Enter Studio</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-[10px] tracking-wider uppercase text-[#52637A] font-mono">
            Designed by Deepak Kumar
          </p>
          <p className="text-[10px] text-[#52637A]/70">
            © {new Date().getFullYear()} Fx Live 24/7 Automation Engine
          </p>
        </div>
      </div>
    </div>
  );
}