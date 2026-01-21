'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Ticket } from './types';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';

const dbPath = path.resolve(process.env.DB_PATH || 'db/tickets.json');

async function readDb(): Promise<Ticket[]> {
  try {
    const fileContent = await fs.readFile(dbPath, 'utf-8');
    if (!fileContent) {
      return [];
    }
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeDb(tickets: Ticket[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(tickets, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing to DB:", error);
    throw error;
  }
}

export async function getTickets(): Promise<Ticket[]> {
  return await readDb();
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const tickets = await readDb();
  return tickets.find(t => t.id === id) || null;
}

const defaultTicket = (width: number, height: number): Ticket => ({
  id: nanoid(),
  name: 'Untitled Ticket',
  backgroundImageUrl: '/Ticket Template 2.png',
  texts: [],
  canvasWidth: width,
  canvasHeight: height,
  createdAt: Date.now(),
});


export async function createTicket(width: number, height: number): Promise<Ticket> {
  const tickets = await readDb();
  const newTicket = defaultTicket(width, height);
  const updatedTickets = [...tickets, newTicket];
  await writeDb(updatedTickets);
  revalidatePath('/');
  return newTicket;
}

export async function updateTicket(updatedTicket: Ticket): Promise<void> {
  let tickets = await readDb();
  const index = tickets.findIndex(t => t.id === updatedTicket.id);
  if (index !== -1) {
    tickets[index] = updatedTicket;
  } else {
    tickets.push(updatedTicket);
  }
  await writeDb(tickets);
  revalidatePath(`/edit/${updatedTicket.id}`);
  revalidatePath('/');
}

export async function deleteTicket(id: string): Promise<void> {
  let tickets = await readDb();
  const updatedTickets = tickets.filter(t => t.id !== id);
  await writeDb(updatedTickets);
  revalidatePath('/');
}

export async function deleteTickets(ids: string[]): Promise<void> {
  let tickets = await readDb();
  const updatedTickets = tickets.filter(t => !ids.includes(t.id));
  await writeDb(updatedTickets);
  revalidatePath('/');
}
