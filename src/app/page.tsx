"use client";

import * as React from 'react';
import type { TextElement, Contact } from '@/lib/types';
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
import { Download, Printer, TextQuoteIcon, Image as ImageIcon, RefreshCcw } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_IMAGE_URL = '/Ticket.png';

export default function Home() {
  const [backgroundImage, setBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  const [clearedBackgroundImage, setClearedBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  const [texts, setTexts] = React.useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const canvasRef = React.useRef<ComposerCanvasHandle>(null);
  const { toast } = useToast();

  const [canvasWidth, setCanvasWidth] = React.useState<number>(0);
  const [canvasHeight, setCanvasHeight] = React.useState<number>(0);
  
  const [printDataUrl, setPrintDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const img = new Image();
    img.src = DEFAULT_IMAGE_URL;
    img.onload = () => {
      setCanvasWidth(img.width);
      setCanvasHeight(img.height);
      setBackgroundImage(img);
    };
  }, []);

  React.useEffect(() => {
    if (printDataUrl) {
      const handleAfterPrint = () => {
        setPrintDataUrl(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
    }
  }, [printDataUrl]);


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
    if (backgroundImage) {
        setClearedBackgroundImage(backgroundImage);
    }
    setBackgroundImage(null);
  };

  const restoreBackgroundImage = () => {
    if (clearedBackgroundImage) {
      setBackgroundImage(clearedBackgroundImage);
      setClearedBackgroundImage(null);
    }
  };

  const addText = (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    
    const newText: TextElement = {
      id: nanoid(),
      text,
      x: canvas.width / 4,
      y: canvas.height / 4,
      fontSize: 48,
      fontFamily: 'Inter',
      color: '#000000',
      ...options,
    };
    setTexts((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  const updateText = (id: string, newProps: Partial<TextElement>) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...newProps } : t)));
  };

  const deleteText = (id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
    setSelectedTextId(null);
  }

  const selectedText = React.useMemo(() => {
    return texts.find((t) => t.id === selectedTextId) || null;
  }, [texts, selectedTextId]);

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

    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'image-composition.png';
      link.href = dataUrl;
      link.click();
      
      setSelectedTextId(currentSelectedId);
    }, 100); 
  };
  
  const handlePrint = (withBackground = false) => {
    const wasSelected = selectedTextId;
    if (wasSelected) {
      setSelectedTextId(null);
    }
  
    // Use a timeout to ensure deselection has rendered
    setTimeout(() => {
      const canvas = canvasRef.current?.getCanvas(withBackground);
      if (!canvas) {
        toast({ title: 'Error', description: 'Could not generate print image.', variant: 'destructive' });
        // Restore selection if print fails
        if (wasSelected) {
          setSelectedTextId(wasSelected);
        }
        return;
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      setPrintDataUrl(dataUrl);
  
      // Restore selection after setting print data, it won't affect printout
      if (wasSelected) {
        setSelectedTextId(wasSelected);
      }
    }, 100);
  };


  return (
    <>
      <div className="no-print">
        <SidebarProvider>
          <Sidebar className="border-r bg-card">
            <SidebarHeader className="p-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <TextQuoteIcon className="w-6 h-6 text-primary-foreground" />
                <h1 className="text-xl font-semibold font-headline">ImageComposer</h1>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-0">
              <ComposerControls
                onClearBackground={clearBackgroundImage}
                onRestoreBackground={restoreBackgroundImage}
                onAddText={addText}
                selectedText={selectedText}
                onUpdateText={updateText}
                onDeleteText={deleteText}
                hasBackgroundImage={!!backgroundImage}
                hasClearedBackgroundImage={!!clearedBackgroundImage}
                contacts={contacts}
                onAddContact={addContact}
                onDeleteContact={deleteContact}
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
                  texts={texts}
                  setTexts={setTexts}
                  selectedTextId={selectedTextId}
                  setSelectedTextId={setSelectedTextId}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                />
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      {printDataUrl && (
        <div className="printable">
          <img src={printDataUrl} alt="Print Content" />
        </div>
      )}
    </>
  );
}
