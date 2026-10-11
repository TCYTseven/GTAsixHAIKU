import { describe, expect, it } from 'vitest';
import { approach, clamp, damp, lerp, smoothstep, wrapAngle } from '../../src/math/util';

describe('math utilities', () => {
  it('clamps and interpolates', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-2, 0, 1)).toBe(0);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });

  it('wraps angles into [-PI, PI)', () => {
    expect(wrapAngle(Math.PI)).toBeCloseTo(-Math.PI, 12);
    expect(wrapAngle(3.5 * Math.PI)).toBeCloseTo(-0.5 * Math.PI, 12);
    expect(wrapAngle(0.5)).toBeCloseTo(0.5, 12);
    expect(wrapAngle(-0.5 - 2 * Math.PI)).toBeCloseTo(-0.5, 12);
  });

  it('damping gives the same result for one long step or two half steps', () => {
    const oneStep = damp(0, 1, 5, 0.2);
    const twoSteps = damp(damp(0, 1, 5, 0.1), 1, 5, 0.1);
    expect(twoSteps).toBeCloseTo(oneStep, 12);
  });

  it('approaches a target without overshooting', () => {
    expect(approach(0, 1, 0.4)).toBeCloseTo(0.4, 12);
    expect(approach(0.9, 1, 0.4)).toBe(1);
    expect(approach(1, 0, 0.4)).toBeCloseTo(0.6, 12);
  });

  it('eases between edges with smoothstep', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
});
