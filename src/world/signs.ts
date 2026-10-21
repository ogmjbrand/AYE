import { CanvasTexture, SRGBColorSpace } from 'three';

/** The name board: gold lettering and a palm on deep green, drawn once on a canvas. */
export function palmsSign(title: string, subtitle: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, '#16302a');
  bg.addColorStop(1, '#0c1d19');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#d9b66a';
  g.lineWidth = 6;
  g.strokeRect(10, 10, 1004, 236);
  g.lineWidth = 2;
  g.strokeRect(22, 22, 980, 212);
  // A small palm left of the name
  g.save();
  g.translate(150, 128);
  g.strokeStyle = '#e8c77e';
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, 70);
  g.quadraticCurveTo(6, 20, 0, -18);
  g.stroke();
  for (const [dx, dy] of [[-60, -10], [60, -10], [-45, -45], [45, -45], [0, -62], [-70, 20], [70, 20]]) {
    g.beginPath();
    g.moveTo(0, -18);
    g.quadraticCurveTo(dx * 0.5, -40 + dy * 0.2, dx, dy);
    g.stroke();
  }
  g.restore();
  g.textAlign = 'center';
  g.fillStyle = '#ecc98a';
  g.font = "700 104px Manrope, 'DM Sans', serif";
  g.fillText(title, 560, 138);
  g.fillStyle = '#c9b48a';
  g.font = "600 34px 'DM Sans', sans-serif";
  g.fillText(subtitle.toUpperCase().split('').join(' '), 560, 200);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The boutique's neon: "Style Your Life" in script with AYE beneath, glowing on a dark panel. */
export function neonSign() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#141414';
  g.fillRect(0, 0, 1024, 384);
  g.textAlign = 'center';
  g.shadowColor = '#ff8fb8';
  g.shadowBlur = 28;
  g.fillStyle = '#ffd6e6';
  g.font = "italic 600 120px Georgia, 'Times New Roman', serif";
  g.fillText('Style Your Life', 512, 170);
  g.shadowColor = '#f2c76e';
  g.shadowBlur = 24;
  g.fillStyle = '#ffe7b0';
  g.font = "800 110px Manrope, 'DM Sans', sans-serif";
  g.fillText('AYE', 512, 320);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
