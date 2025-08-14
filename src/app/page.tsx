
"use client";

import * as React from 'react';
import type { Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { TicketList } from '@/components/ticket-list';

const defaultTicket = (width: number, height: number): Ticket => ({
  id: nanoid(),
  name: 'Untitled Ticket',
  backgroundImageUrl: '/Ticket.png',
  texts: [],
  canvasWidth: width,
  canvasHeight: height,
  createdAt: Date.now(),
});

export default function DashboardPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    try {
      const savedTickets = localStorage.getItem('tickets');
      if (savedTickets) {
        const parsedTickets = JSON.parse(savedTickets);
        if (Array.isArray(parsedTickets)) {
          // Add createdAt if it's missing for backward compatibility
          const ticketsWithDate = parsedTickets.map(t => ({...t, createdAt: t.createdAt || Date.now()}));
          setTickets(ticketsWithDate);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load tickets from localStorage", error);
    }
  }, []);

  const createNewTicket = () => {
    const img = new Image();
    img.src = '/Ticket.png';
    img.onload = () => {
      const newTicket = defaultTicket(img.width, img.height);
      const updatedTickets = [...tickets, newTicket];
      localStorage.setItem('tickets', JSON.stringify(updatedTickets));
      setTickets(updatedTickets);
      router.push(`/edit/${newTicket.id}`);
    };
    img.onerror = () => {
      // Fallback to default size if image fails to load
      const newTicket = defaultTicket(1200, 630);
      const updatedTickets = [...tickets, newTicket];
      localStorage.setItem('tickets', JSON.stringify(updatedTickets));
      setTickets(updatedTickets);
      router.push(`/edit/${newTicket.id}`);
    }
  };

  const deleteTicket = (id: string) => {
    const updatedTickets = tickets.filter(t => t.id !== id);
    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
  };
  
  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    const updatedTickets = tickets.map(t => t.id === id ? {...t, ...updates} : t);
    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
  };


  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <header className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">TicketMaker</h1>
          <Button onClick={createNewTicket}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <TicketList 
            tickets={tickets} 
            onDelete={deleteTicket}
        />
      </main>
    </div>
  );
}

    