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
import { ComposerCanvas } from '@/components/composer-canvas';
import { Button } from '@/components/ui/button';
import { Download, Printer, TextQuoteIcon, Image as ImageIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [backgroundImage, setBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  const [clearedBackgroundImage, setClearedBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  const [texts, setTexts] = React.useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

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


  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        setBackgroundImage(img);
        setClearedBackgroundImage(null); 
        setTexts([]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  const clearBackgroundImage = () => {
    setClearedBackgroundImage(backgroundImage);
    setBackgroundImage(null);
  };

  const restoreBackgroundImage = () => {
    if (clearedBackgroundImage) {
      setBackgroundImage(clearedBackgroundImage);
      setClearedBackgroundImage(null);
    }
  };

  const addText = (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => {
    const canvas = canvasRef.current;
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
    const canvas = canvasRef.current;
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
    const canvas = canvasRef.current;
    if (!canvas) {
        toast({ title: 'Error', description: 'Canvas not found.', variant: 'destructive' });
        return;
    }

    const printCanvas = document.createElement('canvas');
    printCanvas.width = canvas.width;
    printCanvas.height = canvas.height;
    const ctx = printCanvas.getContext('2d');

    if (!ctx) {
        toast({ title: 'Error', description: 'Could not create print context.', variant: 'destructive' });
        return;
    }
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    if (withBackground && backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, printCanvas.width, printCanvas.height);
    }
    
    texts.forEach(text => {
        ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        ctx.fillStyle = text.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text.text, text.x, text.y);
    });
    
    const dataUrl = printCanvas.toDataURL('image/png');
    const printWindow = window.open('', '', `height=${canvas.height},width=${canvas.width}`);
    
    if (!printWindow) {
        toast({
            title: 'Error',
            description: 'Could not open print window. Please disable popup blockers.',
            variant: 'destructive',
        });
        return;
    }

    printWindow.document.write(`
        <html>
            <head>
                <title>Print</title>
                <style>
                    @page {
                        size: ${canvas.width}px ${canvas.height}px;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                    }
                    img {
                        width: 100%;
                        height: 100%;
                        image-rendering: pixelated;
                    }
                </style>
            </head>
            <body>
                <img src="${dataUrl}" />
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  };


  return (
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
            onImageUpload={handleImageUpload}
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
        <div className="h-full flex flex-col bg-background">
          <header className="flex items-center justify-between p-2 border-b bg-card">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
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
            />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
