"use client";

import * as React from 'react';
import type { TextElement } from '@/lib/types';
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
import { Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';

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
  hasClearedBackgroundImage
}: ComposerControlsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  return (
    <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
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
    </Accordion>
  );
}
