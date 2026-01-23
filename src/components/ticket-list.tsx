
"use client";

import * as React from 'react';
import type { Ticket, Contact } from '@/lib/types';
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
import { Checkbox } from './ui/checkbox';

type SortKey = 'name' | 'createdAt' | 'contactName' | 'dueDate';
type SortDirection = 'asc' | 'desc';

interface TicketListProps {
  tickets: Ticket[];
  contacts: Contact[];
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
}

export function TicketList({ tickets, contacts, onDelete, onDeleteMultiple }: TicketListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [selectedTicketIds, setSelectedTicketIds] = React.useState<string[]>([]);
  
  const ticketsWithContact = React.useMemo(() => {
    return tickets.map(ticket => {
        const contact = contacts.find(c => c.id === ticket.contactId);
        return { ...ticket, contactName: contact ? contact.name : '' };
    });
  }, [tickets, contacts]);

  const sortedAndFilteredTickets = React.useMemo(() => {
    return ticketsWithContact
      .filter(ticket => {
          const searchTermLower = searchTerm.toLowerCase();
          const ticketNameMatch = ticket.name.toLowerCase().includes(searchTermLower);
          const contactNameMatch = ticket.contactName.toLowerCase().includes(searchTermLower);
          return ticketNameMatch || contactNameMatch;
      })
      .sort((a, b) => {
        if (sortKey === 'dueDate') {
            const aDate = a.dueDate;
            const bDate = b.dueDate;

            if (aDate === bDate) return 0;
            if (aDate === null || aDate === undefined) return 1;
            if (bDate === null || bDate === undefined) return -1;
            
            if (sortDirection === 'asc') {
                return aDate - bDate;
            } else {
                return bDate - aDate;
            }
        }
        
        const aValue = a[sortKey] || '';
        const bValue = b[sortKey] || '';

        if (aValue < bValue) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
  }, [ticketsWithContact, searchTerm, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  React.useEffect(() => {
    setSelectedTicketIds([]);
  }, [searchTerm, sortKey, sortDirection]);


  const handleSelectTicket = (ticketId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTicketIds(prev => [...prev, ticketId]);
    } else {
      setSelectedTicketIds(prev => prev.filter(id => id !== ticketId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTicketIds(sortedAndFilteredTickets.map(t => t.id));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const handleDeleteSelected = () => {
    onDeleteMultiple(selectedTicketIds);
    setSelectedTicketIds([]);
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">No tickets yet</h2>
        <p className="text-muted-foreground mt-2">Click "New Ticket" to get started.</p>
      </div>
    );
  }

  const numSelected = selectedTicketIds.length;
  const numTickets = sortedAndFilteredTickets.length;

  const getSortDisplayName = () => {
    if (sortKey === 'name') return 'Name';
    if (sortKey === 'createdAt') return 'Date';
    if (sortKey === 'contactName') return 'Contact';
    if (sortKey === 'dueDate') return 'Due Date';
    return '';
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
            <Input 
                placeholder="Search tickets by name or contact..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-sm bg-card/50 backdrop-blur-sm"
            />
            <div className="flex items-center gap-2">
                 {numSelected > 0 && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({numSelected})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete {numSelected} ticket(s). This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Sort by: {getSortDisplayName()} ({sortDirection === 'asc' ? 'Asc' : 'Desc'})
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSort('name')}>Name</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('contactName')}>Contact</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('createdAt')}>Date</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('dueDate')}>Due Date</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <div className="border rounded-lg bg-card/50 backdrop-blur-sm">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">
                       <Checkbox
                            checked={numTickets > 0 && numSelected === numTickets}
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}>
                         <div className='flex items-center'>
                           Name
                           {sortKey === 'name' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                         </div>
                    </TableHead>
                    <TableHead>Elements</TableHead>
                    <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('contactName')}
                    >
                       <div className='flex items-center'>
                         Contact
                         {sortKey === 'contactName' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                       </div>
                    </TableHead>
                    <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('dueDate')}
                    >
                       <div className='flex items-center'>
                         Due Date
                         {sortKey === 'dueDate' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                       </div>
                    </TableHead>
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
                    <TableRow key={ticket.id} className="border-border/50" data-state={selectedTicketIds.includes(ticket.id) ? 'selected' : ''}>
                        <TableCell>
                            <Checkbox
                                checked={selectedTicketIds.includes(ticket.id)}
                                onCheckedChange={(checked) => handleSelectTicket(ticket.id, Boolean(checked))}
                                aria-label={`Select ticket ${ticket.name}`}
                            />
                        </TableCell>
                        <TableCell className="font-medium">{ticket.name}</TableCell>
                        <TableCell>{ticket.texts.length}</TableCell>
                        <TableCell>{ticket.contactName || 'N/A'}</TableCell>
                        <TableCell>{ticket.dueDate ? new Date(ticket.dueDate).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'N/A'}</TableCell>
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

    