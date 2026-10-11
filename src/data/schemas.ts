import { z } from 'zod';

const unitColor = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
]);

const ordered = <T extends z.ZodType<{ min: number; max: number }>>(range: T) =>
  range.refine((value) => value.max >= value.min, { message: 'max must be at least min' });

export const CityConfigSchema = z
  .object({
    seed: z.number().int(),
    blocksPerSide: z.number().int().min(2).max(40),
    blockSize: z.number().min(20).max(120),
    roadWidth: z.number().min(6).max(30),
    sidewalkWidth: z.number().min(1).max(10),
    /** Keep at or below the 0.4 m step height so players can walk up onto sidewalks. */
    sidewalkHeight: z.number().positive().max(0.4),
    buildingHeight: ordered(z.object({ min: z.number().positive(), max: z.number().positive() })),
    buildingsPerBlock: ordered(
      z.object({ min: z.number().int().min(1).max(4), max: z.number().int().min(1).max(4) }),
    ),
    buildingInset: ordered(z.object({ min: z.number().min(0), max: z.number().min(0) })),
    chunkSize: z.number().min(20).max(400),
    palette: z.array(unitColor).min(1),
  })
  .refine((city) => city.buildingInset.max * 2 < city.blockSize / 2, {
    message: 'buildingInset.max is too large for a block (each building cell needs room)',
    path: ['buildingInset'],
  });

export type CityConfig = z.infer<typeof CityConfigSchema>;

export const PlayerConfigSchema = z
  .object({
    halfWidth: z.number().min(0.2).max(0.6),
    height: z.number().min(1.4).max(2.2),
    walkSpeed: z.number().positive().max(12),
    sprintSpeed: z.number().positive().max(20),
    acceleration: z.number().positive(),
    airAcceleration: z.number().positive(),
    /** Radians per second the body turns toward its movement direction. */
    turnRate: z.number().positive(),
    jumpSpeed: z.number().positive(),
    gravity: z.number().positive(),
    /** Tallest ledge walked over without jumping. */
    stepHeight: z.number().min(0.05).max(0.4),
    maxFallSpeed: z.number().positive(),
    cameraDistance: z.number().min(1).max(20),
    cameraHeight: z.number().min(0).max(3),
    cameraMinPitch: z.number().min(-1.5).max(0),
    cameraMaxPitch: z.number().min(0).max(1.5),
  })
  .refine((player) => player.sprintSpeed >= player.walkSpeed, {
    message: 'sprintSpeed must be at least walkSpeed',
    path: ['sprintSpeed'],
  })
  .refine((player) => player.cameraMaxPitch > player.cameraMinPitch, {
    message: 'cameraMaxPitch must be greater than cameraMinPitch',
    path: ['cameraMaxPitch'],
  });

export type PlayerConfig = z.infer<typeof PlayerConfigSchema>;
