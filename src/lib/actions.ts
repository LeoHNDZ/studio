
'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Ticket } from './types';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';

// --- Start of new config management logic ---
const configPath = path.resolve('db/config.json');

interface AppConfig {
    dbPath: string;
}

const defaultConfig: AppConfig = {
    dbPath: 'db/tickets.json'
};

async function readConfig(): Promise<AppConfig> {
    try {
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        const fileContent = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(fileContent) as AppConfig;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await writeConfig(defaultConfig);
            return defaultConfig;
        }
        throw error;
    }
}

async function writeConfig(config: AppConfig): Promise<void> {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function getDbPath(): Promise<string> {
    const config = await readConfig();
    return config.dbPath;
}

export async function updateDbPath(newPath: string): Promise<{success: boolean, error?: string}> {
    if (!newPath || typeof newPath !== 'string') {
        return { success: false, error: "Invalid path provided." };
    }
    if (newPath.includes('..')) {
      return { success: false, error: "Invalid path: '..' is not allowed." };
    }
    try {
      const config = await readConfig();
      config.dbPath = newPath;
      await writeConfig(config);
      revalidatePath('/');
      return { success: true };
    } catch(e: any) {
      return { success: false, error: e.message || "Failed to update path." };
    }
}
// --- End of new config management logic ---

async function getResolvedDbPath(): Promise<string> {
    const configuredPath = await getDbPath();
    return path.resolve(configuredPath);
}

async function readDb(): Promise<Ticket[]> {
  try {
    const dbPath = await getResolvedDbPath();
    const fileContent = await fs.readFile(dbPath, 'utf-8');
    if (!fileContent) {
      return [];
    }
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error("Error reading from DB:", error);
    throw error;
  }
}

async function writeDb(tickets: Ticket[]): Promise<void> {
  try {
    const dbPath = await getResolvedDbPath();
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
