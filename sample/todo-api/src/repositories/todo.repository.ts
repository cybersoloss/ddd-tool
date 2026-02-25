import prisma from '../db/client';

export async function createTodo(data: { title: string; completed?: boolean }) {
  return prisma.todo.create({
    data: {
      title: data.title,
      completed: data.completed ?? false,
    },
  });
}

export async function listTodos(filter?: { completed?: boolean }) {
  return prisma.todo.findMany({
    where: filter?.completed !== undefined ? { completed: filter.completed } : undefined,
    orderBy: { created_at: 'desc' },
  });
}

export async function findTodoById(id: number) {
  return prisma.todo.findFirst({ where: { id } });
}

export async function deleteTodoById(id: number) {
  return prisma.todo.delete({ where: { id } });
}
