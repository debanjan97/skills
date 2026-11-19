import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';
import { loadFont as loadLuckiest } from '@remotion/google-fonts/LuckiestGuy';

export const impactFont = loadBangers().fontFamily;
export const captionFont = loadMontserrat('normal', { weights: ['800', '900'], subsets: ['latin'] }).fontFamily;
export const cardFont = loadLuckiest().fontFamily;
