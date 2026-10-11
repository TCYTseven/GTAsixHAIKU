import type { CityLayout } from '../world/city-generator';

export const MINIMAP_SIZE = 180;
const SCALE = 0.45;

export interface MinimapBlip {
  readonly x: number;
  readonly z: number;
  readonly color: string;
}

export interface MinimapView {
  readonly player: { x: number; z: number; heading: number };
  readonly blips: readonly MinimapBlip[];
}

/** Draws a top-down map that turns with the player: forward is always up. */
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  layout: CityLayout,
  view: MinimapView,
): void {
  const c = MINIMAP_SIZE / 2;
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  ctx.fillStyle = 'rgba(10, 14, 20, 0.75)';
  ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  const fx = Math.sin(view.player.heading);
  const fz = Math.cos(view.player.heading);
  const rx = -fz;
  const rz = fx;
  const toScreen = (x: number, z: number): [number, number] => {
    const dx = x - view.player.x;
    const dz = z - view.player.z;
    return [c + (dx * rx + dz * rz) * SCALE, c - (dx * fx + dz * fz) * SCALE];
  };

  ctx.strokeStyle = '#4a5260';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const road of layout.roads) {
    const [x0, y0] = toScreen(road.minX, road.minZ);
    const [x1, y1] = toScreen(road.maxX, road.maxZ);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();

  for (const blip of view.blips) {
    const [x, y] = toScreen(blip.x, blip.z);
    if (x < 0 || y < 0 || x > MINIMAP_SIZE || y > MINIMAP_SIZE) continue;
    ctx.fillStyle = blip.color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(c, c - 9);
  ctx.lineTo(c - 6, c + 6);
  ctx.lineTo(c + 6, c + 6);
  ctx.closePath();
  ctx.fill();
}
