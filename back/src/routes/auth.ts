import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT username FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ message: 'Credenciais inválidas' });
      return;
    }

    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({ token, username });
  } catch {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;

