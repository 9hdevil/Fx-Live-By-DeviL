import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import VideoSourceTabs from '@/components/VideoSourceTabs';
import VideoLibrary from '@/components/VideoLibrary';
import Layout from '@/components/Layout';
import { GetServerSidePropsContext } from 'next';
import { getSession } from '@/lib/auth';

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

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchVideos = async () => {
    try {
      const response = await axios.get('/api/videos/list');
      setVideos(response.data.videos || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Handle Google Drive OAuth callback notifications
  useEffect(() => {
    if (router.query.drive_connected === 'true') {
      toast.success('Google Drive connected successfully! 🚀');
      router.replace('/videos', undefined, { shallow: true });
    }
    if (router.query.drive_error) {
      const errorMessages: Record<string, string> = {
        access_denied: 'Google Drive access was denied',
        no_code: 'No authorization code received',
        callback_failed: 'Failed to connect Google Drive',
      };
      toast.error(errorMessages[router.query.drive_error as string] || 'Google Drive connection error');
      router.replace('/videos', undefined, { shallow: true });
    }
  }, [router.query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout>
      <div className="p-5 sm:p-7 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[#E8ECF1]">
                Video Asset Library
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25 font-mono">
                {videos.length} {videos.length === 1 ? 'FILE' : 'FILES'}
              </span>
            </div>
            <p className="text-xs text-[#7B8CA3] mt-1">
              Upload local video files or stream-download directly from Google Drive
            </p>
          </div>
        </div>

        {/* Upload & Import Card */}
        <div className="glass-card-static p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/[0.06] pb-3">
            <div className="w-6 h-6 rounded-md bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-[#E8ECF1]">Ingest & Import New Video Asset</h2>
          </div>
          <VideoSourceTabs onImportComplete={fetchVideos} />
        </div>

        {/* Video Asset Library Grid */}
        <div className="glass-card-static p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-[#7B61FF]/10 text-[#7B61FF] flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-[#E8ECF1]">Stored Assets</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-7 h-7 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#8B9BB4]">Scanning storage directory...</span>
              </div>
            </div>
          ) : (
            <VideoLibrary videos={videos} onRefresh={fetchVideos} />
          )}
        </div>
      </div>
    </Layout>
  );
}