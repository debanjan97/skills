import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';

export const impactFont = loadBangers().fontFamily;
export const captionFont = loadMontserrat('normal', { weights: ['900'], subsets: ['latin'] }).fontFamily;
