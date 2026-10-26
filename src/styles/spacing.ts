/**
 * Milestone M13 Spacing & Shape Tokens
 * 1. Shape and space:
 *    - radius 0.5rem (cards, inputs, buttons, modals)
 *    - card padding 1.5rem
 *    - gap between cards 1.5rem
 *    - gap between sections 1.25rem
 *    - detail and table row padding 0.625rem
 *    - modal padding 1.5rem
 *    - button padding 0.5rem 1rem
 *    - input height 2.75rem
 */

export const SPACING = {
  radius: '0.5rem',
  cardPadding: '1.5rem',
  sectionGap: '1.25rem',
  cardGap: '1.5rem',
  rowPadding: '0.625rem',
  modalPadding: '1.5rem',
  buttonPaddingY: '0.5rem',
  buttonPaddingX: '1rem',
  inputHeight: '2.75rem',
} as const;

export default SPACING;
