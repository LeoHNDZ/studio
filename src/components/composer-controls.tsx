
"use client";

import * as React from 'react';
import type { TextElement, Contact, Composition } from '@/lib/types';
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
import { Plus, Trash2, X, UserPlus, BookUser, Check, FilePlus } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

interface ComposerControlsProps {
  onClearBackground: () => void;
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
  compositions: Composition[];
  activeComposition: Composition | null | undefined;
  activeCompositionId: string | null;
  onSetActiveCompositionId: (id: string) => void;
  onCreateNewComposition: () => void;
  onUpdateActiveComposition: (updates: Partial<Composition>) => void;
}

export function ComposerControls({
  onClearBackground,
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
  compositions,
  activeComposition,
  activeCompositionId,
  onSetActiveCompositionId,
  onCreateNewComposition,
  onUpdateActiveComposition,
}: ComposerControlsProps) {
  const [newContactName, setNewContactName] = React.useState('');
  const [newContactDetails, setNewContactDetails] = React.useState('');
  const [isContactDialogOpen, setIsContactDialogOpen] = React.useState(false);

  const handleAddContact = () => {
    if (newContactName.trim() && newContactDetails.trim()) {
      onAddContact(newContactName.trim(), newContactDetails.trim());
      setNewContactName('');
      setNewContactDetails('');
      setIsContactDialogOpen(false);
    }
  };

  return (
    <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4']} className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger className="px-4">Compositions</AccordionTrigger>
        <AccordionContent className="px-4 space-y-2">
          {activeComposition && (
            <div className="space-y-2">
              <Label htmlFor="composition-name">Name</Label>
              <Input
                id="composition-name"
                value={activeComposition.name}
                onChange={(e) => onUpdateActiveComposition({ name: e.target.value })}
                className="w-full"
              />
            </div>
          )}
          <Button className="w-full" onClick={onCreateNewComposition}>
            <FilePlus className="mr-2 h-4 w-4" /> New Composition
          </Button>
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {compositions.map(comp => (
                    <button 
                      key={comp.id} 
                      onClick={() => onSetActiveCompositionId(comp.id)}
                      className={cn(
                        "w-full text-left p-2 rounded-md border text-sm",
                        comp.id === activeCompositionId 
                          ? "bg-primary text-primary-foreground border-primary-foreground" 
                          : "hover:bg-accent"
                      )}
                    >
                      <p className="font-semibold truncate">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">{comp.texts.length} elements</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger className="px-4">Background</AccordionTrigger>
        <AccordionContent className="px-4 space-y-2">
          {hasBackgroundImage && (
             <Button variant="outline" className="w-full" onClick={onClearBackground}>
                <X className="mr-2 h-4 w-4" /> Clear Background
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger className="px-4">Text Elements</AccordionTrigger>
        <AccordionContent className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full" onClick={() => onAddText('New Text')} disabled={isAddingText}>
              <Plus className="mr-2 h-4 w-4" /> {isAddingText ? 'Place Text...' : 'Add Text'}
            </Button>
             <Button className="w-full" onClick={() => onAddText('✔')} disabled={isAddingText}>
              <Check className="mr-2 h-4 w-4" /> {isAddingText ? 'Place Mark...' : 'Add Check'}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Input
                    id="font-size"
                    type="number"
                    value={selectedText.fontSize}
                    onChange={(e) => onUpdateText(selectedText.id, { fontSize: parseInt(e.target.value, 10) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={selectedText.color}
                    className='p-1'
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
              <Button className="w-full">
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
                      <div key={contact.id} className="flex items-center justify-between p-2 rounded-md border">
                        <div className="text-sm">
                           <p className="font-semibold">{contact.name}</p>
                           <p className="text-muted-foreground text-xs whitespace-pre-wrap">{contact.details}</p>
                        </div>
                        <div className='flex gap-1'>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAddText(`${contact.name}\n${contact.details}`)}>
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
    </Accordion>
  );
}
