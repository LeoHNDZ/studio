
"use client";

import * as React from 'react';
import type { Composition } from '@/lib/types';
import Link from 'next/link';
import { Button } from './ui/button';
import { Trash2, Edit } from 'lucide-react';
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
    <div className="border rounded-lg">
      <ul className="divide-y divide-border">
        {compositions.map(comp => (
          <li key={comp.id} className="p-4 flex justify-between items-center hover:bg-muted/50">
            <div>
                <h3 className="font-semibold">{comp.name}</h3>
                <p className="text-sm text-muted-foreground">{comp.texts.length} elements</p>
            </div>
            <div className='flex items-center gap-2'>
                <Link href={`/edit/${comp.id}`} passHref>
                    <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4"/>
                        Edit
                    </Button>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
