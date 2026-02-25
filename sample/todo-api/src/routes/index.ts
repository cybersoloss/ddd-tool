import { Router } from 'express';
import todosRouter from './todos';

const router = Router();

// POST   /api/todos       → create-todo
// GET    /api/todos       → list-todos
// DELETE /api/todos/:id   → delete-todo
router.use('/todos', todosRouter);

export default router;
