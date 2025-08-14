
"use client";

import * as React from 'react';
import type { Ticket } from '@/lib/types';
import Link from 'next/link';
import { Button } from './ui/button';
import { Trash2, Edit, ArrowUpDown } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type SortKey = 'name' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface TicketListProps {
  tickets: Ticket[];
  onDelete: (id: string) => void;
}

export function TicketList({ tickets, onDelete }: TicketListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  const sortedAndFilteredTickets = React.useMemo(() => {
    return tickets
      .filter(ticket => ticket.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue < bValue) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
  }, [tickets, searchTerm, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">No tickets yet</h2>
        <p className="text-muted-foreground mt-2">Click "New Ticket" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
            <Input 
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        Sort by: {sortKey === 'name' ? 'Name' : 'Date'} ({sortDirection === 'asc' ? 'Asc' : 'Desc'})
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSort('name')}>Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('createdAt')}>Date</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className="border rounded-lg">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Elements</TableHead>
                    <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('createdAt')}
                    >
                       <div className='flex items-center'>
                         Created At
                         {sortKey === 'createdAt' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                       </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedAndFilteredTickets.map(ticket => (
                    <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.name}</TableCell>
                        <TableCell>{ticket.texts.length}</TableCell>
                        <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                             <div className='flex items-center justify-end gap-2'>
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
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        </div>
        {sortedAndFilteredTickets.length === 0 && searchTerm && (
             <div className="text-center py-16">
                <h2 className="text-xl font-semibold">No tickets found</h2>
                <p className="text-muted-foreground mt-2">Try a different search term.</p>
            </div>
        )}
    </div>
  );
}
