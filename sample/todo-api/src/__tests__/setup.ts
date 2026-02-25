// Set env vars before any module imports
process.env.DATABASE_URL = 'file:./dev.db';
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
