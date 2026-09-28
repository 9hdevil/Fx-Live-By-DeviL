import '@/styles/globals.css';
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import { applyThemeClass, getStoredSettings } from '@/lib/useStudioSettings';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const settings = getStoredSettings();
    applyThemeClass(settings.theme);
  }, []);

  return (
    <>
      <Head>
        <title>Fx Live 24/7 — Professional Video Automation</title>
        <meta name="description" content="Fx Live 24/7 — Professional 24/7 video streaming and automation platform. Designed by Deepak Kumar." />
        <meta name="author" content="Deepak Kumar" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(19, 29, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#E8ECF1',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
          success: {
            iconTheme: {
              primary: '#00D4FF',
              secondary: '#0B1118',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF4757',
              secondary: '#0B1118',
            },
          },
        }}
      />
    </>
  );
}