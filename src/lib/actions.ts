
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

async function readConfig(): Promise<AppConfig> {
    try {
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        const fileContent = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(fileContent) as AppConfig;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
             const defaultConfig = { dbPath: '' };
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
    if (typeof newPath !== 'string') {
        return { success: false, error: "Invalid path provided." };
    }
    if (newPath && newPath.includes('..')) {
      return { success: false, error: "Invalid path: '..' is not allowed." };
    }
    try {
      const config = await readConfig();
      config.dbPath = newPath;
      await writeConfig(config);

      if (newPath) {
        const resolvedNewPath = path.resolve(newPath);
        try {
          await fs.access(resolvedNewPath);
        } catch (e) {
          // File doesn't exist, create it.
          await fs.mkdir(path.dirname(resolvedNewPath), { recursive: true });
          await fs.writeFile(resolvedNewPath, '[]', 'utf-8');
        }
      }

      revalidatePath('/');
      return { success: true };
    } catch(e: any) {
      return { success: false, error: e.message || "Failed to update path." };
    }
}
// --- End of new config management logic ---

async function getResolvedDbPath(): Promise<string> {
    const configuredPath = await getDbPath();
    if (!configuredPath) {
        return '';
    }
    return path.resolve(configuredPath);
}

export async function getDbContent(): Promise<string> {
    const dbPath = await getResolvedDbPath();
    if (!dbPath) {
        return '[]'; // Return empty array as string if no db is set
    }
    try {
        const fileContent = await fs.readFile(dbPath, 'utf-8');
        return fileContent;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return '[]'; // File doesn't exist, return empty array
        }
        console.error("Error reading from DB for download:", error);
        throw error;
    }
}

async function readDb(): Promise<Ticket[]> {
  const dbPath = await getResolvedDbPath();
  if (!dbPath) {
    return [];
  }
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
    console.error("Error reading from DB:", error);
    throw error;
  }
}

async function writeDb(tickets: Ticket[]): Promise<void> {
  const dbPath = await getResolvedDbPath();
  if (!dbPath) {
    throw new Error("Database path is not configured. Please set it in the settings.");
  }
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
  backgroundImageUrl: '/Ticket.png',
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
