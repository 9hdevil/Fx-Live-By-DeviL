/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Consolas', 'Menlo', 'monospace'],
      },
      colors: {
        // Core backgrounds
        background: '#0B1118',
        'background-alt': '#070C12',
        surface: '#0F1923',
        'surface-hover': '#152230',
        card: '#131D2A',
        'card-elevated': '#182536',

        // Text hierarchy
        foreground: '#E8ECF1',
        'foreground-secondary': '#8B9BB4',
        'foreground-muted': '#4A5568',
        'foreground-dim': '#2D3A4A',

        // Primary accent — electric cyan
        primary: '#00D4FF',
        'primary-foreground': '#0B1118',
        'primary-glow': 'rgba(0, 212, 255, 0.15)',
        'primary-muted': 'rgba(0, 212, 255, 0.08)',

        // Secondary accent — violet-blue
        secondary: '#7B61FF',
        'secondary-foreground': '#E8ECF1',
        'secondary-glow': 'rgba(123, 97, 255, 0.15)',

        // Functional colors
        success: '#00E68A',
        'success-muted': 'rgba(0, 230, 138, 0.12)',
        warning: '#FFB020',
        'warning-muted': 'rgba(255, 176, 32, 0.12)',
        destructive: '#FF4757',
        'destructive-foreground': '#E8ECF1',
        'destructive-muted': 'rgba(255, 71, 87, 0.12)',

        // Borders
        border: 'rgba(255, 255, 255, 0.06)',
        'border-subtle': 'rgba(255, 255, 255, 0.03)',
        'border-active': 'rgba(0, 212, 255, 0.3)',

        // Inputs
        input: '#0F1923',
        'input-border': 'rgba(255, 255, 255, 0.08)',
        'input-focus': 'rgba(0, 212, 255, 0.2)',

        // Muted / secondary UI
        muted: '#182536',
        'muted-foreground': '#6B7D95',

        // Accent alias
        accent: '#00D4FF',
        'accent-foreground': '#0B1118',

        ring: '#00D4FF',
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '14px',
        '2xl': '16px',
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(0, 212, 255, 0.15)',
        'glow': '0 0 16px rgba(0, 212, 255, 0.2)',
        'glow-lg': '0 0 32px rgba(0, 212, 255, 0.25)',
        'glow-violet': '0 0 16px rgba(123, 97, 255, 0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass': '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        'glass': '12px',
        'glass-lg': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}