
"use client";

import * as React from 'react';
import type { TextElement, Contact, Ticket } from '@/lib/types';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ComposerControls } from '@/components/composer-controls';
import { ComposerCanvas, type ComposerCanvasHandle } from '@/components/composer-canvas';
import { Button } from '@/components/ui/button';
import { Download, Printer, TextQuoteIcon, Image as ImageIcon, RefreshCcw, ArrowLeft } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EditPageProps {
  params: {
    compositionId: string;
  };
}

export default function EditPage({ params }: EditPageProps) {
  const { compositionId: ticketId } = params;
  const router = useRouter();

  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [backgroundImage, setBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const [editingTextId, setEditingTextId] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const canvasRef = React.useRef<ComposerCanvasHandle>(null);
  const { toast } = useToast();
  
  const [pendingText, setPendingText] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ticketId) return;

    try {
      const savedTickets = localStorage.getItem('tickets');
      if (savedTickets) {
        const parsedTickets = JSON.parse(savedTickets) as Ticket[];
        const currentTicket = parsedTickets.find(t => t.id === ticketId);
        if (currentTicket) {
          setTicket(currentTicket);
        } else {
          toast({ title: "Error", description: "Ticket not found.", variant: 'destructive' });
          router.push('/');
        }
      } else {
         router.push('/');
      }
    } catch (error) {
      console.error("Failed to load ticket from localStorage", error);
      router.push('/');
    }
  }, [ticketId, router, toast]);

  React.useEffect(() => {
    if (ticket && ticket.backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = ticket.backgroundImageUrl;
      img.onload = () => setBackgroundImage(img);
    } else {
      setBackgroundImage(null);
    }
  }, [ticket?.backgroundImageUrl]);


  // Effect to save the current ticket to localStorage
  React.useEffect(() => {
    if (ticket) {
       try {
        const savedTickets = localStorage.getItem('tickets');
        const tickets = savedTickets ? (JSON.parse(savedTickets) as Ticket[]) : [];
        const updatedTickets = tickets.map(t => t.id === ticket.id ? ticket : t);
        if (!updatedTickets.some(t => t.id === ticket.id)) {
            updatedTickets.push(ticket);
        }
        localStorage.setItem('tickets', JSON.stringify(updatedTickets));
      } catch (error) {
        console.error("Failed to save ticket", error);
      }
    }
  }, [ticket]);

  // Load contacts
  React.useEffect(() => {
    try {
      const savedContacts = localStorage.getItem('contacts');
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    } catch (error) {
      console.error("Failed to load contacts from localStorage", error);
    }
  }, []);

  const updateTicket = (updates: Partial<Ticket>) => {
    if (!ticket) return;
    setTicket(t => t ? { ...t, ...updates } : null);
  };
  
  const setTexts = (newTexts: TextElement[] | ((prev: TextElement[])=>TextElement[])) => {
      if(!ticket) return;
      const updatedTexts = typeof newTexts === 'function' ? newTexts(ticket.texts) : newTexts;
      updateTicket({ texts: updatedTexts });
  }

  const saveContacts = (updatedContacts: Contact[]) => {
    try {
      localStorage.setItem('contacts', JSON.stringify(updatedContacts));
      setContacts(updatedContacts);
    } catch (error) {
      console.error("Failed to save contacts to localStorage", error);
    }
  };

  const addContact = (name: string, details: string) => {
    const newContact: Contact = { id: nanoid(), name, details };
    const updatedContacts = [...contacts, newContact];
    saveContacts(updatedContacts);
  };

  const deleteContact = (id: string) => {
    const updatedContacts = contacts.filter(c => c.id !== id);
    saveContacts(updatedContacts);
  };
  
  const clearBackgroundImage = () => {
    updateTicket({ backgroundImageUrl: null });
  };
  
  const handleRestoreBackground = () => {
    updateTicket({ backgroundImageUrl: '/Ticket.png' });
  };

  const addText = (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => {
    if (!ticket) return;
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    
    const newText: TextElement = {
      id: nanoid(),
      text,
      x: options?.x || canvas.width / 4,
      y: options?.y || canvas.height / 4,
      fontSize: 48,
      fontFamily: 'Inter',
      color: '#000000',
      ...options,
    };
    
    const newTexts = [...ticket.texts, newText];
    updateTicket({ texts: newTexts });
    setSelectedTextId(newText.id);
  };
  
  const startPlacingText = (text: string) => {
    setPendingText(text);
    setSelectedTextId(null);
  };


  const updateText = (id: string, newProps: Partial<TextElement>) => {
    if (!ticket) return;
    const newTexts = ticket.texts.map((t) => (t.id === id ? { ...t, ...newProps } : t));
    updateTicket({ texts: newTexts });
  };

  const deleteText = (id: string) => {
    if (!ticket) return;
    const newTexts = ticket.texts.filter((t) => t.id !== id);
    updateTicket({ texts: newTexts });

    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
    if (editingTextId === id) {
      setEditingTextId(null);
    }
  }

  const selectedText = React.useMemo(() => {
    return ticket?.texts.find((t) => t.id === selectedTextId) || null;
  }, [ticket, selectedTextId]);

  const editingText = React.useMemo(() => {
    return ticket?.texts.find((t) => t.id === editingTextId) || null;
  }, [ticket, editingTextId]);

  const handleExport = () => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) {
      toast({
        title: 'Error',
        description: 'Canvas not found.',
        variant: 'destructive',
      });
      return;
    }
    
    const currentSelectedId = selectedTextId;
    setSelectedTextId(null);
    setEditingTextId(null);

    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${ticket?.name || 'ticket'}.png`;
      link.href = dataUrl;
      link.click();
      
      setSelectedTextId(currentSelectedId);
    }, 100); 
  };
  
  const handlePrint = (withBackground = false) => {
    const wasSelected = selectedTextId;
    setSelectedTextId(null);
    setEditingTextId(null);

    setTimeout(() => {
        const canvas = canvasRef.current?.getCanvas(withBackground);
        if (!canvas) {
            toast({ title: 'Error', description: 'Could not generate print image.', variant: 'destructive' });
            if (wasSelected) setSelectedTextId(wasSelected);
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
            toast({ title: 'Error', description: 'Could not print.', variant: 'destructive' });
            if(wasSelected) setSelectedTextId(wasSelected);
            return;
        }

        doc.open();
        doc.write(`
            <html>
                <head><title>Print</title></head>
                <body>
                    <img src="${dataUrl}" onload="window.print()" />
                </body>
            </html>
        `);
        doc.close();

        let printed = false;
        const printAndCleanup = () => {
            if (printed) return;
            printed = true;

            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            
            // Cleanup
            if (wasSelected) {
                setSelectedTextId(wasSelected);
            }
             if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        };

        iframe.onload = printAndCleanup;

        // Fallback timeout in case onload doesn't fire
        setTimeout(() => {
            if (!printed) {
                printAndCleanup();
            }
        }, 1000);

    }, 100);
};

  
  if (!ticket) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
          <p>Loading ticket...</p>
      </div>
    );
  }

  return (
    <>
      <SidebarProvider>
        <Sidebar className="border-r bg-card">
          <SidebarHeader className="p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
               <Link href="/" passHref>
                 <Button variant="ghost" size="icon"><ArrowLeft /></Button>
               </Link>
              <TextQuoteIcon className="w-6 h-6 text-primary-foreground" />
              <h1 className="text-xl font-semibold font-headline">TicketMaker</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-0">
            <ComposerControls
              onClearBackground={clearBackgroundImage}
              onRestoreBackground={handleRestoreBackground}
              onAddText={startPlacingText}
              selectedText={selectedText}
              onUpdateText={updateText}
              onDeleteText={deleteText}
              hasBackgroundImage={!!ticket.backgroundImageUrl}
              contacts={contacts}
              onAddContact={addContact}
              onDeleteContact={deleteContact}
              isAddingText={!!pendingText}
              onAddContactText={addText}
              activeTicket={ticket}
              onUpdateActiveTicket={updateTicket}
            />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="h-screen flex flex-col bg-background">
            <header className="flex-shrink-0 flex items-center justify-between p-2 border-b bg-card">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.resetView()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset View
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint(false)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint(true)} disabled={!backgroundImage}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Print with BG
                </Button>
                <Button size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PNG
                </Button>
              </div>
            </header>
            <main className="flex-1 p-4 overflow-auto">
              <ComposerCanvas
                ref={canvasRef}
                backgroundImage={backgroundImage}
                texts={ticket.texts}
                setTexts={(newTexts) => setTexts(newTexts)}
                selectedTextId={selectedTextId}
                setSelectedTextId={setSelectedTextId}
                editingText={editingText}
                editingTextId={editingTextId}
                setEditingTextId={setEditingTextId}
                onUpdateText={updateText}
                onDeleteText={deleteText}
                canvasWidth={ticket.canvasWidth}
                canvasHeight={ticket.canvasHeight}
                pendingText={pendingText}
                onTextAdd={addText}
                onCompleteAddText={() => setPendingText(null)}
              />
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

    