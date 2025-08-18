import type { TextElement } from '@/lib/types';

export interface TextSnapshot {
  texts: TextElement[];
  selectedId: string | null;
}

export function makeSnapshot(
  texts: TextElement[],
  selectedId: string | null
): TextSnapshot {
  const clean = texts.map(t => {
    const { _layout, _layoutVersion, ...rest } = t as any;
    return { ...rest };
  });
  return { texts: clean, selectedId };
}