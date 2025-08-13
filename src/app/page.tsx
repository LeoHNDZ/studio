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
          const dpr = window.devicePixelRatio || 1;
          canvas.width = img.width * dpr;
          canvas.height = img.height * dpr;
          canvas.style.width = `${img.width}px`;
          canvas.style.height = `${img.height}px`;
          const ctx = canvas.getContext('2d');
          ctx?.scale(dpr, dpr);
        }
        setBackgroundImage(img);
        setClearedBackgroundImage(null); 
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

    const dpr = window.devicePixelRatio || 1;
    
    const newText: TextElement = {
      id: nanoid(),
      text,
      x: (canvas.width / dpr) / 2,
      y: (canvas.height / dpr) / 2,
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
  
    const printWindow = window.open('', '', `height=${canvas.style.height},width=${canvas.style.width}`);
    if (!printWindow) {
        toast({
            title: 'Error',
            description: 'Could not open print window. Please disable popup blockers.',
            variant: 'destructive',
        });
        return;
    }

    const canvasWidth = parseInt(canvas.style.width, 10) || canvas.width;
    const canvasHeight = parseInt(canvas.style.height, 10) || canvas.height;

    const backgroundStyle = withBackground && backgroundImage
        ? `background-image: url(${backgroundImage.src}); background-size: cover; background-repeat: no-repeat;`
        : 'background-color: white;';

    let printContent = `
        <html>
            <head>
                <title>Print</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: ${canvasWidth}px ${canvasHeight}px;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        font-family: 'Inter', sans-serif;
                        width: ${canvasWidth}px;
                        height: ${canvasHeight}px;
                    }
                    .print-area {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        ${backgroundStyle}
                    }
                    .text-element {
                        position: absolute;
                        white-space: pre;
                        transform-origin: top left;
                        line-height: 1;
                    }
                </style>
            </head>
            <body>
                <div class="print-area">
    `;
    
    texts.forEach(text => {
        printContent += `<div class="text-element" style="left: ${text.x}px; top: ${text.y}px; font-size: ${text.fontSize}px; color: ${text.color}; font-family: '${text.fontFamily}';">${text.text}</div>`;
    });

    printContent += `
                </div>
            </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
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
          <main className="flex-1 p-4 overflow-hidden">
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
