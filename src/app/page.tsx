
"use client";

import * as React from 'react';
import type { Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TicketList } from '@/components/ticket-list';
import { createTicket, deleteTicket, deleteTickets, getTickets } from '@/lib/actions';


export default function DashboardPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    const fetchTickets = async () => {
      try {
        const serverTickets = await getTickets();
        if (Array.isArray(serverTickets)) {
          // Add createdAt if it's missing for backward compatibility
          const ticketsWithDate = serverTickets.map(t => ({...t, createdAt: t.createdAt || Date.now()}));
          setTickets(ticketsWithDate);
        }
      } catch (error) {
        console.error("Failed to load tickets from server", error);
      }
    };
    fetchTickets();
  }, []);

  const createNewTicket = () => {
    const img = new Image();
    img.src = '/Ticket Template 2.png';
    img.onload = async () => {
      const newTicket = await createTicket(img.width, img.height);
      router.push(`/edit/${newTicket.id}`);
    };
    img.onerror = async () => {
      // Fallback to default size if image fails to load
      const newTicket = await createTicket(1200, 630);
      router.push(`/edit/${newTicket.id}`);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    await deleteTicket(id);
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteTickets = async (ids: string[]) => {
    await deleteTickets(ids);
    setTickets(prev => prev.filter(t => !ids.includes(t.id)));
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
            onDelete={handleDeleteTicket}
            onDeleteMultiple={handleDeleteTickets}
        />
      </main>
    </div>
  );
}

    