const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

if (!config.databaseUrl) {
  console.error('Missing required environment variable: DATABASE_URL');
  process.exit(1);
}

export default config as typeof config & { databaseUrl: string };
