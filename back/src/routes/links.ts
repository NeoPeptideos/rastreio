import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

const router = Router();

// Listar links do usuário autenticado
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const result = await pool.query(
    'SELECT id, title, content, created_by AS "createdBy", created_at AS "createdAt" FROM links WHERE created_by = $1 ORDER BY created_at DESC',
    [req.user!.username]
  );
  res.json(result.rows);
});

// Criar novo link (protegido)
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { title, content } = req.body as {
    title?: string;
    content?: string;
  };

  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ message: 'Título e conteúdo são obrigatórios' });
    return;
  }

  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO links (id, title, content, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, content, created_by AS "createdBy", created_at AS "createdAt"`,
    [id, title.trim(), content.trim(), req.user!.username]
  );

  res.status(201).json(result.rows[0]);
});

// Buscar link por ID (público)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT id, title, content, created_by AS "createdBy", created_at AS "createdAt" FROM links WHERE id = $1',
    [id]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ message: 'Link não encontrado' });
    return;
  }

  res.json(result.rows[0]);
});

// Remover link (protegido)
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await pool.query(
    'DELETE FROM links WHERE id = $1 AND created_by = $2',
    [id, req.user!.username]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ message: 'Link não encontrado' });
    return;
  }

  res.json({ message: 'Link removido com sucesso' });
});

export default router;

