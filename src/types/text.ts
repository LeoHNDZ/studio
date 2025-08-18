import type { TextElement } from '@/lib/types';

export interface TextLayout {
  width: number;
  height: number;
  lines: string[];
  lineHeight: number;
  hash: string;
}

export interface TextModel extends TextElement {
  // Optional layout properties for future multiline/alignment features
  alignment?: 'left' | 'center' | 'right';
  rotation?: number;
  lineHeight?: number;
  maxWidth?: number;
  
  // Internal cached layout - not persisted
  _layout?: TextLayout;
  _layoutVersion?: number;
}