import request from 'supertest';
import app from '../app';
import prisma from '../db/client';

beforeEach(async () => {
  await prisma.todo.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── create-todo ───────────────────────────────────────────────────────────────

describe('POST /api/todos', () => {
  it('creates a todo and returns 201', async () => {
    const res = await request(app).post('/api/todos').send({ title: 'Buy milk' });
    expect(res.status).toBe(201);
    expect(res.body.todo.title).toBe('Buy milk');
    expect(res.body.todo.completed).toBe(false);
    expect(res.body.todo.id).toBeDefined();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/todos').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/api/todos').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('respects completed flag when provided', async () => {
    const res = await request(app).post('/api/todos').send({ title: 'Done task', completed: true });
    expect(res.status).toBe(201);
    expect(res.body.todo.completed).toBe(true);
  });
});

// ── list-todos ────────────────────────────────────────────────────────────────

describe('GET /api/todos', () => {
  it('returns empty list when no todos', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body.todos).toEqual([]);
  });

  it('returns todos sorted newest first', async () => {
    await prisma.todo.create({ data: { title: 'First' } });
    await prisma.todo.create({ data: { title: 'Second' } });
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body.todos).toHaveLength(2);
    expect(res.body.todos[0].title).toBe('Second');
  });

  it('filters by ?completed=true', async () => {
    await prisma.todo.create({ data: { title: 'Done', completed: true } });
    await prisma.todo.create({ data: { title: 'Pending', completed: false } });
    const res = await request(app).get('/api/todos?completed=true');
    expect(res.status).toBe(200);
    expect(res.body.todos).toHaveLength(1);
    expect(res.body.todos[0].title).toBe('Done');
  });

  it('filters by ?completed=false', async () => {
    await prisma.todo.create({ data: { title: 'Done', completed: true } });
    await prisma.todo.create({ data: { title: 'Pending', completed: false } });
    const res = await request(app).get('/api/todos?completed=false');
    expect(res.status).toBe(200);
    expect(res.body.todos).toHaveLength(1);
    expect(res.body.todos[0].title).toBe('Pending');
  });

  it('returns 400 for invalid ?completed value', async () => {
    const res = await request(app).get('/api/todos?completed=maybe');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ── delete-todo ───────────────────────────────────────────────────────────────

describe('DELETE /api/todos/:id', () => {
  it('deletes an existing todo and returns 204', async () => {
    const todo = await prisma.todo.create({ data: { title: 'To delete' } });
    const res = await request(app).delete(`/api/todos/${todo.id}`);
    expect(res.status).toBe(204);
    const found = await prisma.todo.findFirst({ where: { id: todo.id } });
    expect(found).toBeNull();
  });

  it('returns 404 when todo does not exist', async () => {
    const res = await request(app).delete('/api/todos/99999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await request(app).delete('/api/todos/abc');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
