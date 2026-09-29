import type { MaterialCategoryId } from '@/lib/materials';

/**
 * One glyph per material, used everywhere a category is shown.
 *
 * Emoji rather than an icon font: they render in colour on every Android
 * build without shipping an asset, and colour is what makes them
 * distinguishable at a glance for someone who cannot read the label.
 */
export const MATERIAL_GLYPH: Record<MaterialCategoryId, string> = {
  pcb_populated: '🖥️',
  pcb_bare: '🟩',
  cables: '🔌',
  crt: '📺',
  lcd_panel: '💻',
  battery_liion: '🔋',
  battery_lead_acid: '🪫',
  motors_magnets: '⚙️',
  plastics_mixed: '🧴',
  aluminium: '🥫',
  ferrous: '🧲',
  ewaste_mixed: '📦',
};
