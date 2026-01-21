
"use client";

import * as React from 'react';
import type { Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, Cog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TicketList } from '@/components/ticket-list';
import { createTicket, deleteTicket, deleteTickets, getTickets, getDbPath, updateDbPath } from '@/lib/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


export default function DashboardPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [dbPath, setDbPath] = React.useState('');
  // Separate state for the input field inside the dialog
  const [newDbPath, setNewDbPath] = React.useState('');

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
      toast({
        variant: "destructive",
        title: "Failed to load tickets",
        description: "Please check the database path in settings.",
      });
      setTickets([]); // Clear tickets on error
    }
  };

  React.useEffect(() => {
    fetchTickets();
    getDbPath().then(path => {
      setDbPath(path);
      setNewDbPath(path);
    });
  }, []);

  const handleSaveSettings = async () => {
    const result = await updateDbPath(newDbPath);
    if (result.success) {
        setDbPath(newDbPath);
        setIsSettingsOpen(false);
        toast({
            title: 'Settings saved',
            description: 'The database path has been updated.',
        });
        // Refetch tickets from the new path
        fetchTickets(); 
    } else {
        toast({
            variant: 'destructive',
            title: 'Error saving settings',
            description: result.error || 'An unknown error occurred.',
        });
    }
  };

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
          <div className="flex items-center gap-2">
            <Button onClick={createNewTicket}>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
             <Dialog open={isSettingsOpen} onOpenChange={(isOpen) => {
              setIsSettingsOpen(isOpen);
              // Reset input field to current path when dialog is closed without saving
              if (!isOpen) {
                setNewDbPath(dbPath);
              }
            }}>
              <DialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Settings">
                      <Cog className="h-4 w-4" />
                  </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                      <Label htmlFor="db-path">Database File Path</Label>
                      <Input
                          id="db-path"
                          value={newDbPath}
                          onChange={(e) => setNewDbPath(e.target.value)}
                          placeholder="e.g., db/tickets.json"
                      />
                       <p className="text-sm text-muted-foreground">
                          Path is relative to the project root.
                      </p>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button variant="ghost">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleSaveSettings}>Save</Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
