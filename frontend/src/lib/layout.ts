/**
 * Shared sizing for the Record page's two cards (tracker + add-record).
 * Rather than guessing a fixed height, each card fills its CSS Grid cell
 * (the grid row is stretched to the available viewport space via
 * `auto-rows-fr` on the parent), so the two cards are always exactly equal
 * and the page never needs to scroll. Content that overflows its card
 * scrolls inside that card instead of growing it.
 */
export const RECORD_CARD_HEIGHT_CLASS = 'h-full min-h-0';
