import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import authRoutes from './routes/auth';
import linksRoutes from './routes/links';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(username),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Seed default admin user if not exists
  await pool.query(`
    INSERT INTO users (username, password)
    VALUES ('admin', 'admin123')
    ON CONFLICT (username) DO NOTHING;
  `);
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/links', linksRoutes);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error('Falha ao inicializar banco de dados:', err);
    process.exit(1);
  });

