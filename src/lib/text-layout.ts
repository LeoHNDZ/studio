import type { TextModel, TextLayout } from '@/types/text';

// Global layout version for cache invalidation
let globalLayoutVersion = 1;

/**
 * Create a hash for layout parameters to detect when recalculation is needed
 */
function createLayoutHash(text: TextModel): string {
  return `${text.text}|${text.fontSize}|${text.fontFamily}|${text.lineHeight || 1.2}|${text.maxWidth || 'auto'}|${text.alignment || 'left'}`;
}

/**
 * Compute layout for a text element using canvas context for measurement
 */
export function computeLayout(text: TextModel, ctx: CanvasRenderingContext2D): TextLayout {
  const hash = createLayoutHash(text);
  
  // Return cached layout if valid
  if (text._layout && text._layout.hash === hash && text._layoutVersion === globalLayoutVersion) {
    return text._layout;
  }

  // Set font for measurement
  ctx.font = `${text.fontSize}px ${text.fontFamily}`;
  
  // For now, simple line splitting by \n (no wrapping yet)
  const lines = text.text.split('\n');
  const lineHeight = text.lineHeight || text.fontSize * 1.2;
  
  // Measure each line and get max width
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, metrics.width);
  }
  
  const height = lines.length * lineHeight;
  
  const layout: TextLayout = {
    width: maxWidth,
    height,
    lines,
    lineHeight,
    hash
  };
  
  // Cache the layout
  text._layout = layout;
  text._layoutVersion = globalLayoutVersion;
  
  return layout;
}

/**
 * Invalidate layout cache for a text element
 */
export function invalidateLayout(text: TextModel): void {
  text._layout = undefined;
  text._layoutVersion = undefined;
}

/**
 * Invalidate all layout caches globally (call when font loading changes, etc.)
 */
export function invalidateAllLayouts(): void {
  globalLayoutVersion++;
}

/**
 * Get cached layout without recomputation (returns undefined if not cached)
 */
export function getCachedLayout(text: TextModel): TextLayout | undefined {
  const hash = createLayoutHash(text);
  if (text._layout && text._layout.hash === hash && text._layoutVersion === globalLayoutVersion) {
    return text._layout;
  }
  return undefined;
}