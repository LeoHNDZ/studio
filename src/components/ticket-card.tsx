
"use client";

import * as React from 'react';
import type { Ticket, Contact } from '@/lib/types';
import Link from 'next/link';
import { Button } from './ui/button';
import { Trash2, Edit, Calendar } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';

interface TicketCardProps {
    ticket: Ticket;
    contact?: Contact;
    onDelete: (id: string) => void;
}

export function TicketCard({ ticket, contact, onDelete }: TicketCardProps) {

    const formatTimeframe = () => {
        if (!ticket.dueDateStart) return 'Not scheduled';

        const start = new Date(ticket.dueDateStart);
        const end = ticket.dueDateEnd ? new Date(ticket.dueDateEnd) : null;

        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
        
        if (end && start.toDateString() === end.toDateString()) {
            return `${start.toLocaleDateString([], dateOptions)}, ${start.toLocaleTimeString([], timeOptions)} - ${end.toLocaleTimeString([], timeOptions)}`;
        }
        
        let str = start.toLocaleString([], {...dateOptions, ...timeOptions});
        if (end) {
            str += ` - ${end.toLocaleString([], {...dateOptions, ...timeOptions})}`;
        }
        return str;
    }
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg font-bold truncate">{ticket.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                {contact && (
                    <Badge variant="secondary" className="font-normal">{contact.name}</Badge>
                )}
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatTimeframe()}</span>
                </div>
                 <p className="text-sm text-muted-foreground">{ticket.texts.length} elements</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Link href={`/edit/${ticket.id}`} passHref>
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
                        This will permanently delete the ticket "{ticket.name}". This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(ticket.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
