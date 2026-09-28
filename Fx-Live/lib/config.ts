const getAuthPassword = () => {
  const envPass = process.env.AUTH_PASSWORD || process.env.ADMIN_PASSWORD_HASH;
  if (envPass && (envPass.startsWith('$2a$') || envPass.startsWith('$2b$'))) {
    return envPass;
  }
  return '$2a$10$Mvo.VrzMErSaRPocq0oQ/u01a5lIVpiKt9cSoJbLzMIJBg0dwGXXa';
};

export const config = {
  auth: {
    username: process.env.AUTH_USERNAME || process.env.ADMIN_USERNAME || 'devil',
    password: getAuthPassword(),
  },
  session: {
    secret: process.env.SESSION_SECRET || 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './public/uploads',
    maxFileSize: process.env.MAX_FILE_SIZE && 
      process.env.MAX_FILE_SIZE !== '0' && 
      process.env.MAX_FILE_SIZE !== 'Infinity' && 
      process.env.MAX_FILE_SIZE !== 'unlimited'
        ? parseInt(process.env.MAX_FILE_SIZE, 10)
        : Infinity,
  },
  database: {
    path: process.env.DATABASE_PATH || './data/streams.db',
  },
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Personal Streaming App',
    port: parseInt(process.env.PORT || '3000'),
    maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS || '10'),
  },
};