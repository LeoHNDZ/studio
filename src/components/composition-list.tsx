
"use client";

import * as React from 'react';
import type { Composition } from '@/lib/types';
import Link from 'next/link';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CompositionListProps {
  compositions: Composition[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Composition>) => void;
}

export function CompositionList({ compositions, onDelete }: CompositionListProps) {
  if (compositions.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">No compositions yet</h2>
        <p className="text-muted-foreground mt-2">Click "New Composition" to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {compositions.map(comp => (
        <div key={comp.id} className="border rounded-lg shadow-sm flex flex-col">
            <Link href={`/edit/${comp.id}`} className='flex-grow'>
                <div className="p-4 bg-muted/50 h-40 flex items-center justify-center">
                    {comp.backgroundImageUrl ? (
                         <img 
                            src={comp.backgroundImageUrl} 
                            alt={comp.name} 
                            className="max-h-full max-w-full object-contain"
                            data-ai-hint="ticket event"
                         />
                    ) : (
                        <div className="w-full h-full bg-gray-200" />
                    )}
                </div>
            </Link>
            <div className="p-4 border-t bg-card flex justify-between items-center">
                <Link href={`/edit/${comp.id}`} className='flex-grow'>
                    <h3 className="font-semibold truncate hover:underline">{comp.name}</h3>
                    <p className="text-sm text-muted-foreground">{comp.texts.length} elements</p>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the composition "{comp.name}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(comp.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

            </div>
        </div>
      ))}
    </div>
  );
}
