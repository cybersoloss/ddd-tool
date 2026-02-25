import app from './app';
import config from './config';

const server = app.listen(config.port, () => {
  console.log(`Todo API running on http://localhost:${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});
