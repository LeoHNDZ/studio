
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
import { Download, Printer, Image as ImageIcon, RefreshCcw, ArrowLeft, Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { updateTicket } from '@/lib/actions';

interface EditPageClientProps {
  compositionId: string;
  initialTicket: Ticket;
}

export default function EditPageClient({ compositionId, initialTicket }: EditPageClientProps) {
  const [ticket, setTicket] = React.useState<Ticket | null>(initialTicket);
  const [backgroundImage, setBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const [editingTextId, setEditingTextId] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const canvasRef = React.useRef<ComposerCanvasHandle>(null);
  const { toast } = useToast();
  
  const [pendingText, setPendingText] = React.useState<string | null>(null);

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


  // Effect to save the current ticket to the database with debouncing
  React.useEffect(() => {
    if (ticket) {
      const handler = setTimeout(async () => {
        try {
          await updateTicket(ticket);
        } catch (error) {
          console.error("Failed to save ticket", error);
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not save your changes to the database.",
          });
        }
      }, 500);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [ticket, toast]);

  // Load contacts from localStorage
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

  const updateTicketState = (updates: Partial<Ticket>) => {
    if (!ticket) return;
    setTicket(t => t ? { ...t, ...updates } : null);
  };
  
  const setTexts = (newTexts: TextElement[] | ((prev: TextElement[])=>TextElement[])) => {
      if(!ticket) return;
      const updatedTexts = typeof newTexts === 'function' ? newTexts(ticket.texts) : newTexts;
      updateTicketState({ texts: updatedTexts });
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
    updateTicketState({ backgroundImageUrl: null });
  };
  
  const handleRestoreBackground = () => {
    updateTicketState({ backgroundImageUrl: '/Ticket.png' });
  };

  const addText = (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => {
    if (!ticket) return;
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    
    const newText: TextElement = {
      id: nanoid(),
      text,
      x: options?.x ?? canvas.width / 4,
      y: options?.y ?? canvas.height / 4,
      fontSize: 47,
      fontFamily: 'Inter',
      color: '#000000',
      ...options,
    };
    
    const newTexts = [...ticket.texts, newText];
    updateTicketState({ texts: newTexts });
    setSelectedTextId(newText.id);
  };
  
  const startPlacingText = (text: string) => {
    setPendingText(text);
    setSelectedTextId(null);
  };


  const updateText = (id: string, newProps: Partial<TextElement>) => {
    if (!ticket) return;
    const newTexts = ticket.texts.map((t) => (t.id === id ? { ...t, ...newProps } : t));
    updateTicketState({ texts: newTexts });
  };

  const deleteText = (id: string) => {
    if (!ticket) return;
    const newTexts = ticket.texts.filter((t) => t.id !== id);
    updateTicketState({ texts: newTexts });

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
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.border = 'none';
        
        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            window.removeEventListener('afterprint', cleanup);
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
            if (wasSelected) {
                setSelectedTextId(wasSelected);
            }
        };

        window.addEventListener('afterprint', cleanup);
        // Fallback cleanup
        setTimeout(cleanup, 3000); 

        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            toast({ title: 'Error', description: 'Could not print.', variant: 'destructive' });
            cleanup();
            return;
        }

        doc.open();
        doc.write(`
            <html>
                <head>
                  <title>Print</title>
                  <style>
                    @page { size: auto; margin: 0; }
                    body { margin: 0; padding: 0; }
                    img { max-width: 100%; }
                  </style>
                </head>
                <body>
                    <img />
                </body>
            </html>
        `);
        
        const img = doc.querySelector('img');
        if (img) {
            img.onload = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error("Print failed", e);
                    toast({ title: 'Error', description: 'Printing failed.', variant: 'destructive' });
                    cleanup();
                }
            };
            img.onerror = () => {
                toast({ title: 'Error', description: 'Image for printing could not be loaded.', variant: 'destructive' });
                cleanup();
            };
            img.src = dataUrl; // Set src last to ensure handlers are attached
        } else {
             toast({ title: 'Error', description: 'Could not create image for printing.', variant: 'destructive' });
             cleanup();
        }
        
        doc.close();

    }, 100);
};

  const handleDuplicate = async () => {
    if (!ticket) return;

    const newTicket: Ticket = {
      ...ticket,
      id: nanoid(),
      name: `Copy of ${ticket.name}`,
      createdAt: Date.now(),
    };

    try {
      await updateTicket(newTicket);
      window.open(`/edit/${newTicket.id}`, '_blank');
    } catch (e) {
      console.error("Failed to duplicate ticket", e);
      toast({ title: "Error", description: "Could not duplicate ticket.", variant: "destructive" });
    }
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
        <Sidebar className="border-r bg-sidebar/70 backdrop-blur-sm">
          <SidebarHeader className="p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
               <Link href="/" passHref>
                 <Button variant="ghost" size="icon"><ArrowLeft /></Button>
               </Link>
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
              onUpdateActiveTicket={updateTicketState}
            />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="h-screen flex flex-col bg-transparent">
            <header className="flex-shrink-0 flex items-center justify-between p-2 border-b bg-card/50 backdrop-blur-sm">
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
                 <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
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

    