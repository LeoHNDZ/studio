
"use client";

import * as React from 'react';
import type { Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, Cog, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TicketList } from '@/components/ticket-list';
import { createTicket, deleteTicket, deleteTickets, getTickets, getDbPath, updateDbPath, getDbContent } from '@/lib/actions';
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
  const [dbPath, setDbPath] = React.useState<string | null>(null);
  const [newDbPath, setNewDbPath] = React.useState('');

  const fetchTickets = React.useCallback(async () => {
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
  }, [toast]);

  React.useEffect(() => {
    getDbPath().then(path => {
      setDbPath(path);
      setNewDbPath(path || '');
    });
  }, []);

  React.useEffect(() => {
    if (dbPath !== null) {
        if (dbPath) {
            fetchTickets();
        } else {
            setTickets([]);
        }
    }
  }, [dbPath, fetchTickets]);


  const handleSaveSettings = async () => {
    const result = await updateDbPath(newDbPath);
    if (result.success) {
        setDbPath(newDbPath);
        setIsSettingsOpen(false);
        toast({
            title: 'Settings saved',
            description: newDbPath ? `Database path set to ${newDbPath}` : 'Database path cleared.',
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error saving settings',
            description: result.error || 'An unknown error occurred.',
        });
    }
  };
  
  const handleDownloadBackup = async () => {
    try {
        const content = await getDbContent();
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const currentPath = dbPath || 'tickets.json';
        const fileName = currentPath.split(/[\\/]/).pop() || 'tickets.json';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
            title: 'Backup downloaded',
            description: `Saved as ${fileName}`,
        });
    } catch (error) {
        console.error("Failed to download backup", error);
        toast({
            variant: "destructive",
            title: "Download failed",
            description: "Could not download the database backup.",
        });
    }
  };

  const createNewTicket = () => {
    if (!dbPath) {
        toast({
            variant: "destructive",
            title: "No Database Selected",
            description: "Please create or select a database in the settings.",
        });
        return;
    }

    const img = new Image();
    img.src = '/Ticket.png';
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

  if (dbPath === null) {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p>Loading configuration...</p>
          </div>
      )
  }


  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <header className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">TicketMaker</h1>
          <div className="flex items-center gap-2">
            <Button onClick={createNewTicket} disabled={!dbPath}>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
             <Dialog open={isSettingsOpen} onOpenChange={(isOpen) => {
              setIsSettingsOpen(isOpen);
              // Reset input field to current path when dialog is closed without saving
              if (!isOpen) {
                setNewDbPath(dbPath || '');
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
                          placeholder="e.g. C:\Users\User\Documents\tickets.json"
                      />
                       <p className="text-sm text-muted-foreground">
                          Enter an absolute path on your PC to save the database file. The file will be created automatically if it doesn't exist.
                      </p>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={handleDownloadBackup} disabled={!dbPath} className="mr-auto">
                        <Download className="mr-2 h-4 w-4" />
                        Download Backup
                      </Button>
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
        {dbPath ? (
            <TicketList 
                tickets={tickets} 
                onDelete={handleDeleteTicket}
                onDeleteMultiple={handleDeleteTickets}
            />
        ) : (
            <div className="text-center py-16">
                <h2 className="text-xl font-semibold">No Database Selected</h2>
                <p className="text-muted-foreground mt-2 mb-4">
                    Create a new database or select an existing one to get started.
                </p>
                <Button onClick={() => setIsSettingsOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create or Add Database
                </Button>
            </div>
        )}
      </main>
    </div>
  );
}
