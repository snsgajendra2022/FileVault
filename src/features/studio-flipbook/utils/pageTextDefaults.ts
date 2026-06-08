import type { EventType, FlipbookTheme, GeneratedPage, GeneratedPageElement, TextSlotDef } from '../types';
import { getTemplate } from '../templates';

export type TextContext = {
  albumTitle: string;
  pageNumber: number;
  pageType: GeneratedPage['pageType'];
  eventType: EventType;
};

export function resolveAutoTextContent(slot: TextSlotDef, ctx: TextContext): string {
  if (slot.defaultContent?.trim()) return slot.defaultContent;

  switch (slot.role) {
    case 'title':
      return ctx.pageType === 'cover' ? ctx.albumTitle : ctx.albumTitle || `Page ${ctx.pageNumber}`;
    case 'caption':
      return ctx.pageType === 'closing' ? 'With love' : 'Beautiful moments';
    case 'date':
      return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    case 'thank_you':
      return 'Thank You';
    case 'quote':
      return 'Forever & Always';
    case 'subtitle':
      return ctx.albumTitle;
    default:
      return 'Add your text';
  }
}

export function createFreeTextElement(
  theme: FlipbookTheme,
  ctx: TextContext,
  existingTextCount = 0
): GeneratedPageElement {
  return {
    elementType: 'text',
    content: ctx.pageType === 'cover' ? ctx.albumTitle : 'Your text here',
    x: 10,
    y: 42 + (existingTextCount % 3) * 8,
    width: 80,
    height: 10,
    zIndex: 15,
    styleJson: {
      role: 'custom',
      fontSizePx: ctx.pageType === 'cover' ? 48 : 28,
      fontFamily: theme.titleFont,
      fontWeight: 600,
      color: theme.textColor,
      align: 'center',
      lineHeight: 1.3,
    },
  };
}

/** Fill empty text slots from the page layout template */
export function autoFillPageText(page: GeneratedPage, ctx: TextContext, theme: FlipbookTheme): GeneratedPage {
  const tmpl = getTemplate(page.layoutType);
  const elements = [...page.elements];

  for (const slot of tmpl.textSlots) {
    const idx = elements.findIndex(
      (e) => e.elementType === 'text' && e.styleJson?.role === slot.role
    );
    const content = resolveAutoTextContent(slot, ctx);

    if (idx >= 0) {
      const el = elements[idx];
      if (!el.content?.trim()) {
        elements[idx] = { ...el, content };
      }
      continue;
    }

    elements.push({
      elementType: 'text',
      content,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      zIndex: 10,
      styleJson: {
        role: slot.role,
        fontSizePx: slot.fontSizePx,
        fontFamily: slot.fontFamily ?? theme.titleFont,
        fontWeight: slot.fontWeight,
        color: slot.color,
        align: slot.align,
        letterSpacing: slot.letterSpacing,
        lineHeight: slot.lineHeight,
        shadow: slot.shadow,
      },
    });
  }

  return { ...page, elements };
}
