
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
  const { compositionId } = params;
  const router = useRouter();

  const [composition, setComposition] = React.useState<Composition | null>(null);
  const [backgroundImage, setBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const [editingTextId, setEditingTextId] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const canvasRef = React.useRef<ComposerCanvasHandle>(null);
  const { toast } = useToast();
  
  const [pendingText, setPendingText] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!compositionId) return;

    try {
      const savedCompositions = localStorage.getItem('compositions');
      if (savedCompositions) {
        const parsedComps = JSON.parse(savedCompositions) as Composition[];
        const currentComp = parsedComps.find(c => c.id === compositionId);
        if (currentComp) {
          setComposition(currentComp);
        } else {
          toast({ title: "Error", description: "Composition not found.", variant: 'destructive' });
          router.push('/');
        }
      } else {
         router.push('/');
      }
    } catch (error) {
      console.error("Failed to load composition from localStorage", error);
      router.push('/');
    }
  }, [compositionId, router, toast]);

  React.useEffect(() => {
    if (composition && composition.backgroundImageUrl) {
      const img = new Image();
      img.src = composition.backgroundImageUrl;
      img.onload = () => setBackgroundImage(img);
    } else {
      setBackgroundImage(null);
    }
  }, [composition?.backgroundImageUrl]);


  // Effect to save the current composition to localStorage
  React.useEffect(() => {
    if (composition) {
       try {
        const savedCompositions = localStorage.getItem('compositions');
        const comps = savedCompositions ? (JSON.parse(savedCompositions) as Composition[]) : [];
        const updatedComps = comps.map(c => c.id === composition.id ? composition : c);
        if (!updatedComps.some(c => c.id === composition.id)) {
            updatedComps.push(composition);
        }
        localStorage.setItem('compositions', JSON.stringify(updatedComps));
      } catch (error) {
        console.error("Failed to save composition", error);
      }
    }
  }, [composition]);

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

  const updateComposition = (updates: Partial<Composition>) => {
    if (!composition) return;
    setComposition(comp => comp ? { ...comp, ...updates } : null);
  };
  
  const setTexts = (newTexts: TextElement[] | ((prev: TextElement[])=>TextElement[])) => {
      if(!composition) return;
      const updatedTexts = typeof newTexts === 'function' ? newTexts(composition.texts) : newTexts;
      updateComposition({ texts: updatedTexts });
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
    updateComposition({ backgroundImageUrl: null });
  };
  
  const addText = (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => {
    if (!composition) return;
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
    
    const newTexts = [...composition.texts, newText];
    updateComposition({ texts: newTexts });
    setSelectedTextId(newText.id);
  };
  
  const startPlacingText = (text: string) => {
    setPendingText(text);
    setSelectedTextId(null);
  };


  const updateText = (id: string, newProps: Partial<TextElement>) => {
    if (!composition) return;
    const newTexts = composition.texts.map((t) => (t.id === id ? { ...t, ...newProps } : t));
    updateComposition({ texts: newTexts });
  };

  const deleteText = (id: string) => {
    if (!composition) return;
    const newTexts = composition.texts.filter((t) => t.id !== id);
    updateComposition({ texts: newTexts });

    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
    if (editingTextId === id) {
      setEditingTextId(null);
    }
  }

  const selectedText = React.useMemo(() => {
    return composition?.texts.find((t) => t.id === selectedTextId) || null;
  }, [composition, selectedTextId]);

  const editingText = React.useMemo(() => {
    return composition?.texts.find((t) => t.id === editingTextId) || null;
  }, [composition, editingTextId]);

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
      link.download = `${composition?.name || 'composition'}.png`;
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
          document.body.removeChild(iframe);
          toast({ title: 'Error', description: 'Could not print.', variant: 'destructive' });
          if(wasSelected) setSelectedTextId(wasSelected);
          return;
      }

      doc.open();
      doc.write(`
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
            <img src="${dataUrl}" onload="window.print()" />
          </body>
        </html>
      `);
      doc.close();

      const cleanup = () => {
          if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
          }
          if (wasSelected) {
              setSelectedTextId(wasSelected);
          }
      };

      iframe.contentWindow?.addEventListener('afterprint', cleanup);
      // Fallback for browsers that don't support afterprint well
      setTimeout(cleanup, 2000);
    }, 100);
  };
  
  if (!composition) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
          <p>Loading composition...</p>
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
              hasBackgroundImage={!!composition.backgroundImageUrl}
              contacts={contacts}
              onAddContact={addContact}
              onDeleteContact={deleteContact}
              isAddingText={!!pendingText}
              onAddContactText={addText}
              activeComposition={composition}
              onUpdateActiveComposition={updateComposition}
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
                texts={composition.texts}
                setTexts={(newTexts) => setTexts(newTexts)}
                selectedTextId={selectedTextId}
                setSelectedTextId={setSelectedTextId}
                editingText={editingText}
                editingTextId={editingTextId}
                setEditingTextId={setEditingTextId}
                onUpdateText={updateText}
                onDeleteText={deleteText}
                canvasWidth={composition.canvasWidth}
                canvasHeight={composition.canvasHeight}
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
