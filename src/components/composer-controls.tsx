
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, X, UserPlus, BookUser, Check, RefreshCcw, BrainCircuit } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { suggestQuote } from '@/ai/flows/suggest-quote';

interface ComposerControlsProps {
  onClearBackground: () => void;
  onRestoreBackground: () => void;
  onAddText: (text: string) => void;
  selectedText: TextElement | null;
  onUpdateText: (id: string, newProps: Partial<TextElement>) => void;
  onDeleteText: (id: string) => void;
  hasBackgroundImage: boolean;
  contacts: Contact[];
  onAddContact: (name: string, details: string) => void;
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
  onDeleteContact,
  isAddingText,
  onAddContactText,
  activeTicket,
  onUpdateActiveTicket,
}: ComposerControlsProps) {
  const [newContactName, setNewContactName] = React.useState('');
  const [newContactDetails, setNewContactDetails] = React.useState('');
  const [isContactDialogOpen, setIsContactDialogOpen] = React.useState(false);
  const [quoteTopic, setQuoteTopic] = React.useState('');
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const { toast } = useToast();
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const prevTextIdRef = React.useRef<string | null>(null);

  // Normalize to single line
  const normalizeSingleLine = (input: string) => input
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const autoResizeTextarea = React.useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, []);

  // Selective one-time auto-select (exclude '✔')
  React.useEffect(() => {
    if (!selectedText || !textAreaRef.current) {
      prevTextIdRef.current = selectedText?.id ?? null;
      return;
    }
    const el = textAreaRef.current;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';

    const isNewElement =
      prevTextIdRef.current !== selectedText.id &&
      selectedText.text === 'New Text';

    if (isNewElement) {
      el.focus();
      el.select();
    } else {
      el.focus();
    }

    prevTextIdRef.current = selectedText.id;
  }, [selectedText?.id, selectedText?.text]);

  const handleTextChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedText) {
      onUpdateText(selectedText.id, { text: e.target.value });
      setTimeout(autoResizeTextarea, 0);
    }
  }, [selectedText, onUpdateText, autoResizeTextarea]);

  const handlePaste = React.useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!selectedText || !textAreaRef.current) return;
    e.preventDefault();
    const raw = e.clipboardData.getData('text/plain');
    const insert = normalizeSingleLine(raw);
    const el = textAreaRef.current;
    const { selectionStart, selectionEnd, value } = el;
    const nextValue = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
    onUpdateText(selectedText.id, { text: nextValue });
    requestAnimationFrame(() => {
      if (!textAreaRef.current) return;
      const t = textAreaRef.current;
      t.style.height = 'auto';
      t.style.height = t.scrollHeight + 'px';
      const caret = selectionStart + insert.length;
      t.selectionStart = t.selectionEnd = caret;
    });
  }, [selectedText, onUpdateText]);

  const handleAddContact = () => {
    if (newContactName.trim() && newContactDetails.trim()) {
      onAddContact(newContactName.trim(), newContactDetails.trim());
      setNewContactName('');
      setNewContactDetails('');
      setIsContactDialogOpen(false);
    }
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
        <AccordionContent className="px-4 space-y-2">
          {activeTicket && (
            <div className="space-y-2">
              <Label htmlFor="ticket-name">Name</Label>
              <Input
                id="ticket-name"
                value={activeTicket.name}
                onChange={(e) => onUpdateActiveTicket({ name: e.target.value })}
                className="w-full bg-background/50"
              />
            </div>
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
                      ref={textAreaRef}
                      id="text-content"
                      value={selectedText.text}
                      onChange={handleTextChange}
                      onPaste={handlePaste}
                      rows={1}
                      className="bg-background/50 resize-none overflow-hidden"
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
          <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <UserPlus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a new contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-contact-name">Name</Label>
                  <Input
                    id="new-contact-name"
                    placeholder="John Doe"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-contact-details">Details</Label>
                  <Textarea 
                    id="new-contact-details"
                    placeholder="123 Main St..."
                    value={newContactDetails}
                    onChange={(e) => setNewContactDetails(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddContact}>Save Contact</Button>
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
                        <div className="text-sm">
                           <p className="font-semibold">{contact.name}</p>
                           <p className="text-muted-foreground text-xs whitespace-pre-wrap">{contact.details}</p>
                        </div>
                        <div className='flex gap-1'>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAddContactText(`${contact.name}\n${contact.details}`)}>
                                <Plus className="h-4 w-4" />
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

    