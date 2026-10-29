import { CanvasTexture, SRGBColorSpace } from 'three';
import { memoTexture } from './textureCache';

/** Name tag above a person: their name and, underneath, who they are (always saying when they're computer-controlled). */
export function nameTag(name: string, subtitle = 'Resident · computer-controlled') {
  return memoTexture(`tag:${name}:${subtitle}`, () => drawTag(name, subtitle));
}

function drawTag(name: string, subtitle: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(21,24,28,0.78)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 36);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1ede6';
  ctx.font = "700 56px Manrope, 'DM Sans', sans-serif";
  ctx.fillText(name, 256, 74);
  ctx.fillStyle = '#a4a7ad';
  ctx.font = "500 34px 'DM Sans', sans-serif";
  ctx.fillText(subtitle, 256, 124);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
