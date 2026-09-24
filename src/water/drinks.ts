import type { Drink } from './model';

/**
 * The drinks, with how much of each counts as water, and rough caffeine and
 * energy per 8 oz. The numbers are typical values for a plain serving, meant
 * for a daily tally, not a lab.
 */
export const DRINKS: Drink[] = [
  // water, more or less
  { id: 'water', name: 'Water', factor: 1, glyph: 'glass', defaultOz: 8, kind: 'water' },
  { id: 'sparkling', name: 'Sparkling', factor: 1, glyph: 'bubbles', defaultOz: 12, kind: 'water' },
  { id: 'mineral', name: 'Mineral water', factor: 1, glyph: 'bottle', defaultOz: 16, kind: 'water' },
  { id: 'flavoured', name: 'Flavoured water', factor: 1, glyph: 'bottle', defaultOz: 16, kind: 'water' },
  { id: 'electrolytes', name: 'Electrolytes', factor: 1, glyph: 'bolt', defaultOz: 16, kcalPer8: 10, kind: 'water' },
  { id: 'sports', name: 'Sports drink', factor: 1, glyph: 'bolt', defaultOz: 20, kcalPer8: 55, kind: 'water' },
  { id: 'coconut', name: 'Coconut water', factor: 1, glyph: 'coconut', defaultOz: 12, kcalPer8: 45, kind: 'water' },
  { id: 'maple', name: 'Maple water', factor: 1, glyph: 'leaf', defaultOz: 12, kcalPer8: 20, kind: 'water' },
  { id: 'aloe', name: 'Aloe water', factor: 0.95, glyph: 'leaf', defaultOz: 12, kcalPer8: 60, kind: 'water' },
  { id: 'tonic', name: 'Tonic water', factor: 0.8, glyph: 'bubbles', defaultOz: 8, kcalPer8: 85, kind: 'water' },

  // tea and coffee
  { id: 'tea', name: 'Tea', factor: 0.9, glyph: 'cup', defaultOz: 8, caffeinePer8: 47, kcalPer8: 2, kind: 'tea & coffee' },
  { id: 'green-tea', name: 'Green tea', factor: 0.9, glyph: 'cup', defaultOz: 8, caffeinePer8: 28, kcalPer8: 2, kind: 'tea & coffee' },
  { id: 'herbal-tea', name: 'Herbal tea', factor: 1, glyph: 'cup', defaultOz: 8, kcalPer8: 2, kind: 'tea & coffee' },
  { id: 'matcha', name: 'Matcha', factor: 0.9, glyph: 'cup', defaultOz: 8, caffeinePer8: 70, kcalPer8: 5, kind: 'tea & coffee' },
  { id: 'iced-tea', name: 'Iced tea', factor: 0.9, glyph: 'straw', defaultOz: 16, caffeinePer8: 25, kcalPer8: 70, kind: 'tea & coffee' },
  { id: 'chai', name: 'Chai latte', factor: 0.85, glyph: 'mug', defaultOz: 12, caffeinePer8: 25, kcalPer8: 120, kind: 'tea & coffee' },
  { id: 'mate', name: 'Yerba mate', factor: 0.9, glyph: 'cup', defaultOz: 8, caffeinePer8: 80, kcalPer8: 5, kind: 'tea & coffee' },
  { id: 'bubble-tea', name: 'Bubble tea', factor: 0.7, glyph: 'boba', defaultOz: 16, caffeinePer8: 30, kcalPer8: 150, kind: 'tea & coffee' },
  { id: 'coffee', name: 'Coffee', factor: 0.8, glyph: 'mug', defaultOz: 12, caffeinePer8: 95, kcalPer8: 2, kind: 'tea & coffee' },
  { id: 'espresso', name: 'Espresso', factor: 0.6, glyph: 'shot', defaultOz: 2, caffeinePer8: 500, kcalPer8: 10, kind: 'tea & coffee' },
  { id: 'latte', name: 'Latte', factor: 0.85, glyph: 'mug', defaultOz: 12, caffeinePer8: 85, kcalPer8: 125, kind: 'tea & coffee' },
  { id: 'cappuccino', name: 'Cappuccino', factor: 0.85, glyph: 'shot', defaultOz: 8, caffeinePer8: 85, kcalPer8: 90, kind: 'tea & coffee' },
  { id: 'iced-coffee', name: 'Iced coffee', factor: 0.85, glyph: 'straw', defaultOz: 16, caffeinePer8: 90, kcalPer8: 60, kind: 'tea & coffee' },
  { id: 'cold-brew', name: 'Cold brew', factor: 0.8, glyph: 'straw', defaultOz: 16, caffeinePer8: 150, kcalPer8: 5, kind: 'tea & coffee' },
  { id: 'decaf', name: 'Decaf', factor: 0.9, glyph: 'mug', defaultOz: 12, caffeinePer8: 3, kcalPer8: 2, kind: 'tea & coffee' },
  { id: 'hot-chocolate', name: 'Hot chocolate', factor: 0.85, glyph: 'mug', defaultOz: 8, caffeinePer8: 5, kcalPer8: 190, kind: 'tea & coffee' },

  // milk and its cousins
  { id: 'milk', name: 'Milk', factor: 0.9, glyph: 'carton', defaultOz: 8, kcalPer8: 150, kind: 'milk' },
  { id: 'oat-milk', name: 'Oat milk', factor: 0.9, glyph: 'carton', defaultOz: 8, kcalPer8: 120, kind: 'milk' },
  { id: 'almond-milk', name: 'Almond milk', factor: 0.95, glyph: 'carton', defaultOz: 8, kcalPer8: 40, kind: 'milk' },
  { id: 'soy-milk', name: 'Soy milk', factor: 0.9, glyph: 'carton', defaultOz: 8, kcalPer8: 100, kind: 'milk' },
  { id: 'choc-milk', name: 'Chocolate milk', factor: 0.85, glyph: 'carton', defaultOz: 8, caffeinePer8: 5, kcalPer8: 190, kind: 'milk' },
  { id: 'kefir', name: 'Kefir', factor: 0.85, glyph: 'bottle', defaultOz: 8, kcalPer8: 110, kind: 'milk' },
  { id: 'lassi', name: 'Lassi', factor: 0.85, glyph: 'glass', defaultOz: 8, kcalPer8: 160, kind: 'milk' },
  { id: 'protein', name: 'Protein shake', factor: 0.8, glyph: 'blender', defaultOz: 12, kcalPer8: 110, kind: 'milk' },
  { id: 'milkshake', name: 'Milkshake', factor: 0.7, glyph: 'straw', defaultOz: 12, kcalPer8: 340, kind: 'milk' },

  // juice and soda
  { id: 'juice', name: 'Juice', factor: 0.8, glyph: 'straw', defaultOz: 8, kcalPer8: 110, kind: 'juice & soda' },
  { id: 'orange-juice', name: 'Orange juice', factor: 0.85, glyph: 'glass', defaultOz: 8, kcalPer8: 110, kind: 'juice & soda' },
  { id: 'apple-juice', name: 'Apple juice', factor: 0.85, glyph: 'glass', defaultOz: 8, kcalPer8: 115, kind: 'juice & soda' },
  { id: 'veg-juice', name: 'Vegetable juice', factor: 0.9, glyph: 'glass', defaultOz: 8, kcalPer8: 50, kind: 'juice & soda' },
  { id: 'lemonade', name: 'Lemonade', factor: 0.85, glyph: 'straw', defaultOz: 12, kcalPer8: 100, kind: 'juice & soda' },
  { id: 'smoothie', name: 'Smoothie', factor: 0.8, glyph: 'blender', defaultOz: 12, kcalPer8: 130, kind: 'juice & soda' },
  { id: 'kombucha', name: 'Kombucha', factor: 0.9, glyph: 'bottle', defaultOz: 12, caffeinePer8: 10, kcalPer8: 30, kind: 'juice & soda' },
  { id: 'soda', name: 'Soda', factor: 0.7, glyph: 'can', defaultOz: 12, caffeinePer8: 23, kcalPer8: 100, kind: 'juice & soda' },
  { id: 'diet-soda', name: 'Diet soda', factor: 0.8, glyph: 'can', defaultOz: 12, caffeinePer8: 30, kind: 'juice & soda' },
  { id: 'energy', name: 'Energy drink', factor: 0.7, glyph: 'can', defaultOz: 8, caffeinePer8: 80, kcalPer8: 110, kind: 'juice & soda' },
  { id: 'horchata', name: 'Horchata', factor: 0.8, glyph: 'glass', defaultOz: 12, kcalPer8: 190, kind: 'juice & soda' },

  // alcohol counts, but not for much
  { id: 'beer', name: 'Beer', factor: 0.6, glyph: 'pint', defaultOz: 12, kcalPer8: 100, kind: 'alcohol' },
  { id: 'cider', name: 'Cider', factor: 0.6, glyph: 'pint', defaultOz: 12, kcalPer8: 110, kind: 'alcohol' },
  { id: 'seltzer', name: 'Hard seltzer', factor: 0.7, glyph: 'can', defaultOz: 12, kcalPer8: 65, kind: 'alcohol' },
  { id: 'wine', name: 'Wine', factor: 0.5, glyph: 'wine', defaultOz: 5, kcalPer8: 190, kind: 'alcohol' },
  { id: 'sake', name: 'Sake', factor: 0.5, glyph: 'shot', defaultOz: 3, kcalPer8: 300, kind: 'alcohol' },
  { id: 'cocktail', name: 'Cocktail', factor: 0.4, glyph: 'cocktail', defaultOz: 6, kcalPer8: 220, kind: 'alcohol' },
  { id: 'spirits', name: 'Spirits', factor: 0.2, glyph: 'cocktail', defaultOz: 1.5, kcalPer8: 520, kind: 'alcohol' },

  // food you drink
  { id: 'soup', name: 'Soup', factor: 0.8, glyph: 'bowl', defaultOz: 12, kcalPer8: 90, kind: 'food & other' },
  { id: 'broth', name: 'Broth', factor: 0.9, glyph: 'bowl', defaultOz: 8, kcalPer8: 15, kind: 'food & other' },
];

/** the drinks the Today grid starts with; the rest wait in the full list */
export const DEFAULT_PANEL = [
  'water',
  'sparkling',
  'electrolytes',
  'tea',
  'coffee',
  'milk',
  'juice',
  'soda',
  'beer',
  'wine',
  'smoothie',
  'coconut',
  'soup',
];
