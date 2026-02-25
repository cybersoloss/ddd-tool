import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../errors';
import * as todoRepo from '../repositories/todo.repository';

const router = Router();

// create-todo — POST /api/todos
const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  completed: z.boolean().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const result = createTodoSchema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError('VALIDATION_ERROR', result.error.errors.map(e => e.message).join(', ')));
    }
    const todo = await todoRepo.createTodo(result.data);
    res.status(201).json({ todo });
  } catch (err) {
    next(err);
  }
});

// list-todos — GET /api/todos?completed=true|false
const listQuerySchema = z.object({
  completed: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const result = listQuerySchema.safeParse(req.query);
    if (!result.success) {
      return next(new AppError('VALIDATION_ERROR', result.error.errors.map(e => e.message).join(', ')));
    }
    const todos = await todoRepo.listTodos(result.data);
    res.status(200).json({ todos });
  } catch (err) {
    next(err);
  }
});

// delete-todo — DELETE /api/todos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return next(new AppError('VALIDATION_ERROR', 'Invalid todo ID'));
    }
    const todo = await todoRepo.findTodoById(id);
    if (!todo) {
      return next(new AppError('NOT_FOUND', 'Todo not found'));
    }
    await todoRepo.deleteTodoById(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
