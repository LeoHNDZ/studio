
"use client";

import * as React from 'react';
import type { TextElement, Contact, Composition } from '@/lib/types';
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

const defaultComposition = (width: number, height: number): Composition => ({
  id: nanoid(),
  name: 'Untitled Composition',
  backgroundImageUrl: DEFAULT_IMAGE_URL,
  texts: [],
  canvasWidth: width,
  canvasHeight: height,
});

export default function Home() {
  const [compositions, setCompositions] = React.useState<Composition[]>([]);
  const [activeCompositionId, setActiveCompositionId] = React.useState<string | null>(null);
  
  const [backgroundImage, setBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  const [texts, setTexts] = React.useState<TextElement[]>([]);
  const [canvasWidth, setCanvasWidth] = React.useState<number>(0);
  const [canvasHeight, setCanvasHeight] = React.useState<number>(0);

  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const [editingTextId, setEditingTextId] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const canvasRef = React.useRef<ComposerCanvasHandle>(null);
  const { toast } = useToast();
  
  const [pendingText, setPendingText] = React.useState<string | null>(null);

  // Load initial image to get dimensions
  React.useEffect(() => {
    const img = new Image();
    img.src = DEFAULT_IMAGE_URL;
    img.onload = () => {
      setCanvasWidth(img.width);
      setCanvasHeight(img.height);
      
      try {
        const savedCompositions = localStorage.getItem('compositions');
        const savedActiveId = localStorage.getItem('activeCompositionId');
        
        if (savedCompositions && savedActiveId) {
          const parsedComps = JSON.parse(savedCompositions);
          if (Array.isArray(parsedComps) && parsedComps.length > 0) {
            setCompositions(parsedComps);
            setActiveCompositionId(savedActiveId);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load compositions from localStorage", error);
      }
      
      // If no saved data, create a new default composition
      const newComp = defaultComposition(img.width, img.height);
      setCompositions([newComp]);
      setActiveCompositionId(newComp.id);
    };
  }, []);

  const activeComposition = React.useMemo(() => {
    return compositions.find(c => c.id === activeCompositionId);
  }, [compositions, activeCompositionId]);

  // Effect to update canvas when active composition changes
  React.useEffect(() => {
    if (activeComposition) {
      setTexts(activeComposition.texts);
      setCanvasWidth(activeComposition.canvasWidth);
      setCanvasHeight(activeComposition.canvasHeight);
      
      if (activeComposition.backgroundImageUrl) {
        const img = new Image();
        img.src = activeComposition.backgroundImageUrl;
        img.onload = () => {
          setBackgroundImage(img);
        };
      } else {
        setBackgroundImage(null);
      }
    } else {
      setTexts([]);
      setBackgroundImage(null);
    }
  }, [activeComposition]);


  // Effect to save compositions to localStorage
  React.useEffect(() => {
    if (compositions.length > 0 && activeCompositionId) {
      localStorage.setItem('compositions', JSON.stringify(compositions));
      localStorage.setItem('activeCompositionId', activeCompositionId);
    }
  }, [compositions, activeCompositionId]);

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

  const updateActiveComposition = (updates: Partial<Composition>) => {
    if (!activeCompositionId) return;
    setCompositions(comps => comps.map(c => 
      c.id === activeCompositionId ? { ...c, ...updates } : c
    ));
  };


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
    updateActiveComposition({ backgroundImageUrl: null });
  };
  
  const addText = (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => {
    if (!activeComposition) return;
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
    
    const newTexts = [...activeComposition.texts, newText];
    updateActiveComposition({ texts: newTexts });
    setSelectedTextId(newText.id);
  };
  
  const startPlacingText = (text: string) => {
    setPendingText(text);
    setSelectedTextId(null);
  };


  const updateText = (id: string, newProps: Partial<TextElement>) => {
    const newTexts = texts.map((t) => (t.id === id ? { ...t, ...newProps } : t));
    updateActiveComposition({ texts: newTexts });
  };

  const deleteText = (id: string) => {
    const newTexts = texts.filter((t) => t.id !== id);
    updateActiveComposition({ texts: newTexts });

    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
    if (editingTextId === id) {
      setEditingTextId(null);
    }
  }

  const selectedText = React.useMemo(() => {
    return texts.find((t) => t.id === selectedTextId) || null;
  }, [texts, selectedTextId]);

  const editingText = React.useMemo(() => {
    return texts.find((t) => t.id === editingTextId) || null;
  }, [texts, editingTextId]);

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
      link.download = 'image-composition.png';
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
        
        iframe.onload = () => {
            try {
                if (iframe.contentWindow) {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                }
            } catch(e) {
                toast({ title: 'Error', description: 'Printing failed.', variant: 'destructive' });
            } finally {
                if(document.body.contains(iframe)){
                    document.body.removeChild(iframe);
                }
                if (wasSelected) {
                    setSelectedTextId(wasSelected);
                }
            }
        };

        iframe.srcdoc = `
            <html>
                <head>
                    <title>Print</title>
                    <style>
                        @page { size: auto; margin: 0; }
                        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
                        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <img src="${dataUrl}" />
                </body>
            </html>
        `;

        document.body.appendChild(iframe);
    }, 100);
  };
  
  const createNewComposition = () => {
    const newComp = defaultComposition(canvasWidth, canvasHeight);
    setCompositions(prev => [...prev, newComp]);
    setActiveCompositionId(newComp.id);
  };


  return (
    <>
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
              onAddText={startPlacingText}
              selectedText={selectedText}
              onUpdateText={updateText}
              onDeleteText={deleteText}
              hasBackgroundImage={!!activeComposition?.backgroundImageUrl}
              contacts={contacts}
              onAddContact={addContact}
              onDeleteContact={deleteContact}
              isAddingText={!!pendingText}
              onAddContactText={addText}
              compositions={compositions}
              activeComposition={activeComposition}
              activeCompositionId={activeCompositionId}
              onSetActiveCompositionId={setActiveCompositionId}
              onCreateNewComposition={createNewComposition}
              onUpdateActiveComposition={updateActiveComposition}
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
                editingText={editingText}
                editingTextId={editingTextId}
                setEditingTextId={setEditingTextId}
                onUpdateText={updateText}
                onDeleteText={deleteText}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
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
