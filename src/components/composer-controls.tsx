"use client";

import * as React from 'react';
import type { TextElement, Contact } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RotateCcw, Trash2, Upload, X, UserPlus, BookUser } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface ComposerControlsProps {
  onImageUpload: (file: File) => void;
  onClearBackground: () => void;
  onRestoreBackground: () => void;
  onAddText: (text: string) => void;
  selectedText: TextElement | null;
  onUpdateText: (id: string, newProps: Partial<TextElement>) => void;
  onDeleteText: (id: string) => void;
  hasBackgroundImage: boolean;
  hasClearedBackgroundImage: boolean;
  contacts: Contact[];
  onAddContact: (name: string, details: string) => void;
  onDeleteContact: (id: string) => void;
}

export function ComposerControls({
  onImageUpload,
  onClearBackground,
  onRestoreBackground,
  onAddText,
  selectedText,
  onUpdateText,
  onDeleteText,
  hasBackgroundImage,
  hasClearedBackgroundImage,
  contacts,
  onAddContact,
  onDeleteContact,
}: ComposerControlsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [newContactName, setNewContactName] = React.useState('');
  const [newContactDetails, setNewContactDetails] = React.useState('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleAddContact = () => {
    if (newContactName.trim() && newContactDetails.trim()) {
      onAddContact(newContactName.trim(), newContactDetails.trim());
      setNewContactName('');
      setNewContactDetails('');
    }
  };

  return (
    <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3']} className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger className="px-4">Background</AccordionTrigger>
        <AccordionContent className="px-4 space-y-2">
          <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload Image
          </Button>
          {hasBackgroundImage && (
             <Button variant="outline" className="w-full" onClick={onClearBackground}>
                <X className="mr-2 h-4 w-4" /> Clear Background
            </Button>
          )}
          {hasClearedBackgroundImage && !hasBackgroundImage && (
             <Button variant="outline" className="w-full" onClick={onRestoreBackground}>
                <RotateCcw className="mr-2 h-4 w-4" /> Restore Background
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger className="px-4">Text Elements</AccordionTrigger>
        <AccordionContent className="px-4 space-y-4">
          <Button className="w-full" onClick={() => onAddText('New Text')}>
            <Plus className="mr-2 h-4 w-4" /> Add Text
          </Button>
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
            <p className="text-sm text-muted-foreground text-center p-4">Select a text element to edit its properties.</p>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger className="px-4">Contacts</AccordionTrigger>
        <AccordionContent className="px-4 space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
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
              <Button className="w-full" onClick={handleAddContact}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </CardContent>
          </Card>
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
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAddText(contact.details)}>
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
