import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function HistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
  size = 'sm'
}: HistoryControlsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size={size}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl/⌘+Z)"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl/⌘+Shift+Z or Ctrl/⌘+Y)"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}