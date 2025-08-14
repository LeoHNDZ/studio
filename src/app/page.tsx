
"use client";

import * as React from 'react';
import type { Composition } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { CompositionList } from '@/components/composition-list';

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

const defaultComposition = (width: number, height: number): Composition => ({
  id: nanoid(),
  name: 'Untitled Composition',
  backgroundImageUrl: '/Ticket.png',
  texts: [],
  canvasWidth: width,
  canvasHeight: height,
});

export default function DashboardPage() {
  const [compositions, setCompositions] = React.useState<Composition[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    try {
      const savedCompositions = localStorage.getItem('compositions');
      if (savedCompositions) {
        const parsedComps = JSON.parse(savedCompositions);
        if (Array.isArray(parsedComps)) {
          setCompositions(parsedComps);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load compositions from localStorage", error);
    }
  }, []);

  const createNewComposition = () => {
    const newComp = defaultComposition(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    const updatedCompositions = [...compositions, newComp];
    localStorage.setItem('compositions', JSON.stringify(updatedCompositions));
    setCompositions(updatedCompositions);
    router.push(`/edit/${newComp.id}`);
  };

  const deleteComposition = (id: string) => {
    const updatedCompositions = compositions.filter(c => c.id !== id);
    localStorage.setItem('compositions', JSON.stringify(updatedCompositions));
    setCompositions(updatedCompositions);
  };
  
  const updateComposition = (id: string, updates: Partial<Composition>) => {
    const updatedCompositions = compositions.map(c => c.id === id ? {...c, ...updates} : c);
    localStorage.setItem('compositions', JSON.stringify(updatedCompositions));
    setCompositions(updatedCompositions);
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b bg-card">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">ImageCompositions</h1>
          <Button onClick={createNewComposition}>
            <Plus className="mr-2 h-4 w-4" />
            New Composition
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <CompositionList 
            compositions={compositions} 
            onDelete={deleteComposition}
            onUpdate={updateComposition}
        />
      </main>
    </div>
  );
}
