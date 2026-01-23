
"use client";

import * as React from 'react';
import type { TextElement, Contact, Ticket } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, X, UserPlus, BookUser, Check, RefreshCcw, BrainCircuit, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { suggestQuote } from '@/ai/flows/suggest-quote';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface ComposerControlsProps {
  onClearBackground: () => void;
  onRestoreBackground: () => void;
  onAddText: (text: string) => void;
  selectedText: TextElement | null;
  onUpdateText: (id: string, newProps: Partial<TextElement>) => void;
  onDeleteText: (id: string) => void;
  hasBackgroundImage: boolean;
  contacts: Contact[];
  onAddContact: (name: string, phone: string, email: string, address: string) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  isAddingText: boolean;
  onAddContactText: (text: string) => void;
  activeTicket: Ticket | null | undefined;
  onUpdateActiveTicket: (updates: Partial<Ticket>) => void;
}

export function ComposerControls({
  onClearBackground,
  onRestoreBackground,
  onAddText,
  selectedText,
  onUpdateText,
  onDeleteText,
  hasBackgroundImage,
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  isAddingText,
  onAddContactText,
  activeTicket,
  onUpdateActiveTicket,
}: ComposerControlsProps) {
  const [isContactDialogOpen, setIsContactDialogOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
  const [contactForm, setContactForm] = React.useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [quoteTopic, setQuoteTopic] = React.useState('');
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const { toast } = useToast();

  const handleOpenAddDialog = () => {
    setEditingContact(null);
    setContactForm({ name: '', phone: '', email: '', address: '' });
    setIsContactDialogOpen(true);
  };

  const handleOpenEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
    });
    setIsContactDialogOpen(true);
  };

  const handleSaveContact = () => {
    if (!contactForm.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name is required',
        description: 'Please enter a name for the contact.',
      });
      return;
    }

    if (editingContact) {
      onUpdateContact({ ...editingContact, ...contactForm });
    } else {
      onAddContact(
        contactForm.name.trim(),
        contactForm.phone.trim(),
        contactForm.email.trim(),
        contactForm.address.trim()
      );
    }
    setIsContactDialogOpen(false);
  };
  
  const handleSuggestQuote = async () => {
    if (!quoteTopic.trim()) return;
    setIsSuggesting(true);
    try {
      const quote = await suggestQuote(quoteTopic);
      onAddText(quote);
    } catch (error) {
      console.error("Failed to suggest quote", error);
      toast({
        title: 'Error',
        description: 'Could not fetch a quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSuggesting(false);
      setQuoteTopic('');
    }
  };

  return (
    <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4', 'item-5']} className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger className="px-4">Ticket</AccordionTrigger>
        <AccordionContent className="px-4 space-y-4">
          {activeTicket && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ticket-name">Name</Label>
                <Input
                  id="ticket-name"
                  value={activeTicket.name}
                  onChange={(e) => onUpdateActiveTicket({ name: e.target.value })}
                  className="w-full bg-background/50"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="assign-contact">Assign Contact</Label>
                  <Select
                      value={activeTicket.contactId || 'none'}
                      onValueChange={(contactId) => onUpdateActiveTicket({ contactId: contactId === 'none' ? null : contactId })}
                  >
                      <SelectTrigger id="assign-contact" className="w-full bg-background/50">
                          <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {contacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                  {contact.name}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <div className="space-y-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-background/50",
                                    !activeTicket.dueDateStart && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {activeTicket.dueDateStart ? format(new Date(activeTicket.dueDateStart), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={activeTicket.dueDateStart ? new Date(activeTicket.dueDateStart) : undefined}
                                onSelect={(date) => {
                                    if (!date) {
                                        onUpdateActiveTicket({ dueDateStart: null });
                                        return;
                                    }
                                    let hours = 0;
                                    let minutes = 0;
                                    if(activeTicket.dueDateStart) {
                                        const currentDueDate = new Date(activeTicket.dueDateStart);
                                        hours = currentDueDate.getHours();
                                        minutes = currentDueDate.getMinutes();
                                    }
                                    
                                    date.setHours(hours, minutes, 0, 0);
                                    onUpdateActiveTicket({ dueDateStart: date.getTime() });
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Input
                        type="time"
                        className="w-full bg-background/50"
                        value={activeTicket.dueDateStart ? format(new Date(activeTicket.dueDateStart), 'HH:mm') : ''}
                        onChange={(e) => {
                            const time = e.target.value;
                            if (!activeTicket.dueDateStart || !time) return;

                            const [hours, minutes] = time.split(':').map(Number);
                            const newDate = new Date(activeTicket.dueDateStart);
                            newDate.setHours(hours);
                            newDate.setMinutes(minutes);
                            onUpdateActiveTicket({ dueDateStart: newDate.getTime() });
                        }}
                        disabled={!activeTicket.dueDateStart}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label>End Date & Time</Label>
                <div className="space-y-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-background/50",
                                    !activeTicket.dueDateEnd && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {activeTicket.dueDateEnd ? format(new Date(activeTicket.dueDateEnd), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={activeTicket.dueDateEnd ? new Date(activeTicket.dueDateEnd) : undefined}
                                onSelect={(date) => {
                                    if (!date) {
                                        onUpdateActiveTicket({ dueDateEnd: null });
                                        return;
                                    }
                                    let hours = 0;
                                    let minutes = 0;
                                    if(activeTicket.dueDateEnd) {
                                        const currentDueDate = new Date(activeTicket.dueDateEnd);
                                        hours = currentDueDate.getHours();
                                        minutes = currentDueDate.getMinutes();
                                    }
                                    
                                    date.setHours(hours, minutes, 0, 0);
                                    onUpdateActiveTicket({ dueDateEnd: date.getTime() });
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Input
                        type="time"
                        className="w-full bg-background/50"
                        value={activeTicket.dueDateEnd ? format(new Date(activeTicket.dueDateEnd), 'HH:mm') : ''}
                        onChange={(e) => {
                            const time = e.target.value;
                            if (!activeTicket.dueDateEnd || !time) return;

                            const [hours, minutes] = time.split(':').map(Number);
                            const newDate = new Date(activeTicket.dueDateEnd);
                            newDate.setHours(hours);
                            newDate.setMinutes(minutes);
                            onUpdateActiveTicket({ dueDateEnd: newDate.getTime() });
                        }}
                        disabled={!activeTicket.dueDateEnd}
                    />
                </div>
              </div>
            </>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger className="px-4">Background</AccordionTrigger>
        <AccordionContent className="px-4 space-y-2">
          {hasBackgroundImage ? (
             <Button variant="outline" className="w-full" onClick={onClearBackground}>
                <X className="mr-2 h-4 w-4" /> Clear Background
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={onRestoreBackground}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Restore Background
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger className="px-4">Text Elements</AccordionTrigger>
        <AccordionContent className="px-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button className="flex-grow" variant="outline" onClick={() => onAddText('New Text')} disabled={isAddingText}>
              <Plus className="mr-2 h-4 w-4" /> {isAddingText ? 'Place Text...' : 'Add Text'}
            </Button>
             <Button size="icon" variant="outline" onClick={() => onAddText('✔')} disabled={isAddingText} aria-label="Add Checkmark">
              <Check className="h-4 w-4" />
            </Button>
          </div>
          {selectedText ? (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text-content">Content</Label>
                   <Textarea
                      id="text-content"
                      value={selectedText.text}
                      onChange={(e) => onUpdateText(selectedText.id, { text: e.target.value })}
                      rows={4}
                      className="bg-background/50"
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Input
                    id="font-size"
                    type="number"
                    value={selectedText.fontSize}
                    onChange={(e) => onUpdateText(selectedText.id, { fontSize: parseInt(e.target.value, 10) })}
                     className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={selectedText.color}
                    className='p-1 bg-background/50'
                    onChange={(e) => onUpdateText(selectedText.id, { color: e.target.value })}
                  />
                </div>
                <Button variant="destructive" size="sm" className="w-full" onClick={() => onDeleteText(selectedText.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Element
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground text-center p-4">
              {isAddingText ? 'Click on the canvas to place your element.' : 'Select a text element to edit its properties.'}
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger className="px-4">Contacts</AccordionTrigger>
        <AccordionContent className="px-4 space-y-4">
          <Button className="w-full" variant="outline" onClick={handleOpenAddDialog}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Contact
          </Button>
          <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingContact ? 'Edit Contact' : 'Add a new contact'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    placeholder="John Doe"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({...prev, name: e.target.value}))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone Number</Label>
                  <Input
                    id="contact-phone"
                    placeholder="e.g. 555-123-4567"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({...prev, phone: e.target.value}))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({...prev, email: e.target.value}))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-address">Address</Label>
                  <Textarea
                    id="contact-address"
                    placeholder="123 Main St..."
                    value={contactForm.address}
                    onChange={(e) => setContactForm(prev => ({...prev, address: e.target.value}))}
                  />
                </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSaveContact}>Save Contact</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
             <CardContent className="pt-4">
              <h3 className="text-sm font-medium mb-2 flex items-center"><BookUser className="mr-2 h-4 w-4" />Saved Contacts</h3>
               <ScrollArea className="h-48">
                {contacts.length > 0 ? (
                  <div className="space-y-2">
                    {contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-2 rounded-md border border-border/50">
                        <div className="text-sm overflow-hidden">
                           <p className="font-semibold truncate">{contact.name}</p>
                           <div className="text-muted-foreground text-xs whitespace-pre-wrap">
                             {contact.phone && <p className="truncate">T: {contact.phone}</p>}
                             {contact.email && <p className="truncate">E: {contact.email}</p>}
                             {contact.address && <p className="truncate">A: {contact.address}</p>}
                           </div>
                        </div>
                        <div className='flex gap-1'>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAddContactText(`${contact.name}${contact.phone ? `\n${contact.phone}` : ''}`)}>
                                <Plus className="h-4 w-4" />
                            </Button>
                             <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenEditDialog(contact)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDeleteContact(contact.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center p-4">No contacts saved yet.</p>
                )}
               </ScrollArea>
             </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-5">
        <AccordionTrigger className="px-4">AI Tools</AccordionTrigger>
        <AccordionContent className="px-4 space-y-4">
           <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                    <Label htmlFor="quote-topic">Suggest a Quote</Label>
                    <div className="flex items-center gap-2">
                      <Input
                          id="quote-topic"
                          placeholder="e.g. 'Success'"
                          value={quoteTopic}
                          onChange={(e) => setQuoteTopic(e.target.value)}
                          disabled={isSuggesting}
                          className="bg-background/50"
                      />
                      <Button onClick={handleSuggestQuote} disabled={!quoteTopic.trim() || isSuggesting}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        {isSuggesting ? 'Thinking...' : 'Suggest'}
                      </Button>
                    </div>
                </div>
              </CardContent>
           </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
