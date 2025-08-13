"use client";

import * as React from 'react';
import type { TextElement } from '@/lib/types';
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
import { Download, Printer, TextQuoteIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [backgroundImage, setBackgroundImage] = React.useState<HTMLImageElement | null>(null);
  const [texts, setTexts] = React.useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setBackgroundImage(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addText = (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const newText: TextElement = {
      id: nanoid(),
      text,
      x: canvas.width / 2,
      y: canvas.height / 2,
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
    
    // Temporarily deselect to hide selection box
    const currentSelectedId = selectedTextId;
    setSelectedTextId(null);

    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'image-composition.png';
      link.href = dataUrl;
      link.click();
      
      // Reselect
      setSelectedTextId(currentSelectedId);
    }, 100); // Timeout to allow canvas to redraw
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Could not open print window. Please disable popup blockers.',
        variant: 'destructive',
      });
      return;
    }

    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 1000;
    const canvasHeight = canvas?.height || 800;
    
    let printContent = `
      <html>
        <head>
          <title>Text-Only Print</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');
            body { margin: 0; font-family: 'Inter', sans-serif; }
            .print-area { position: relative; width: ${canvasWidth}px; height: ${canvasHeight}px; overflow: hidden; }
            .text-element { position: absolute; white-space: pre; transform-origin: top left; }
          </style>
        </head>
        <body>
          <div class="print-area">
    `;

    texts.forEach(text => {
      printContent += `<div class="text-element" style="left: ${text.x}px; top: ${text.y - text.fontSize}px; font-size: ${text.fontSize}px; color: ${text.color}; font-family: ${text.fontFamily};">${text.text}</div>`;
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
            onAddText={addText}
            selectedText={selectedText}
            onUpdateText={updateText}
            onDeleteText={deleteText}
          />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="h-full flex flex-col bg-background">
          <header className="flex items-center justify-between p-2 border-b bg-card">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Text
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
