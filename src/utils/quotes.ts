/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ZEN_QUOTES = [
  "Do not seek to follow in the footsteps of the wise. Seek what they sought.",
  "Nature does not hurry, yet everything is accomplished.",
  "The quiet mind is all that is necessary to find truth.",
  "To the mind that is still, the entire universe surrenders.",
  "Silence is a source of great strength.",
  "Be like water making its way through cracks.",
  "Empty your mind, be formless, shapeless, like water.",
  "The only Zen you find on the tops of mountains is the Zen you bring up there.",
  "Within you, there is a stillness and a sanctuary to which you can retreat at any time.",
  "One moment of patience can ward off great disaster.",
  "Mindfulness isn't difficult, we just need to remember to do it.",
  "Knock on the sky and listen to the sound.",
  "Flow with whatever may happen, and let your mind be free.",
  "Purity, patience, and perseverance are the three essentials to success."
];

export function getRandomQuote(seed: number): string {
  const index = Math.abs(seed) % ZEN_QUOTES.length;
  return ZEN_QUOTES[index];
}
