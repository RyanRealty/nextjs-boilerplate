// Font loader — inject @font-face from local files (same as Cowork `work/cascade_peaks`).
// Requires in `public/`: Amboqia_Boriango.otf, AzoSans-Medium.ttf (not committed — copy from
// BRAND MANAGER / jackstraw_video public on the VM, or from the other agent’s `public/`).

import { staticFile } from 'remotion';
import { FONT_BODY, FONT_SERIF } from './brand';

type FontSpec = {
  family: string;
  url: string;
  weight?: string;
};

const loadRobust = ({ family, url, weight = '400' }: FontSpec) => {
  if (typeof document === 'undefined') return;

  const styleId = `font-face-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @font-face {
      font-family: '${family}';
      src: url('${url}') format('opentype'), url('${url}') format('truetype');
      font-weight: ${weight};
      font-style: normal;
      font-display: block;
    }
  `;
  document.head.appendChild(style);
};

loadRobust({
  family: FONT_SERIF,
  url: staticFile('Amboqia_Boriango.otf'),
  weight: '400',
});

loadRobust({
  family: FONT_BODY,
  url: staticFile('AzoSans-Medium.ttf'),
  weight: '500',
});
