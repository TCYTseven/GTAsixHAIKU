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

export const VehicleConfigSchema = z.object({
  id: z.string().min(1),
  /** Top forward speed in metres per second. */
  maxSpeed: z.number().positive().max(60),
  acceleration: z.number().positive(),
  brakeForce: z.number().positive(),
  reverseSpeed: z.number().positive(),
  maxSteerDegrees: z.number().positive().max(60),
  wheelbase: z.number().positive(),
  /** Lateral grip. Lower values slide more. */
  grip: z.number().positive(),
  mass: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  health: z.number().positive(),
  bodyColors: z.array(unitColor).min(1),
  /** Relative chance of this model being parked on a street. */
  spawnWeight: z.number().positive(),
});

export type VehicleConfig = z.infer<typeof VehicleConfigSchema>;

export const ChaseCameraSchema = z
  .object({
    baseDistance: z.number().min(2).max(20),
    /** Extra metres of distance per metre per second of speed. */
    speedDistance: z.number().min(0).max(1),
    maxDistance: z.number().min(2).max(40),
    height: z.number().min(0).max(5),
    /** How quickly the camera's focus catches up with the car. Higher is tighter. */
    lagSharpness: z.number().positive(),
    /** Radians per second the camera swings behind the car when the mouse is idle. */
    alignRate: z.number().positive(),
  })
  .refine((camera) => camera.maxDistance >= camera.baseDistance, {
    message: 'maxDistance must be at least baseDistance',
    path: ['maxDistance'],
  });

export type ChaseCameraConfig = z.infer<typeof ChaseCameraSchema>;

export const VehiclesConfigSchema = z.object({
  types: z.array(VehicleConfigSchema).min(1),
  parkedCount: z.number().int().min(0).max(200),
  chaseCamera: ChaseCameraSchema,
});

export type VehiclesConfig = z.infer<typeof VehiclesConfigSchema>;

export const PopulationConfigSchema = z
  .object({
    pedestrians: z.number().int().min(0).max(300),
    traffic: z.number().int().min(0).max(120),
    /** Nothing spawns closer than this to the player. */
    spawnMinDistance: z.number().positive(),
    /** Anything farther than this is removed. */
    despawnDistance: z.number().positive(),
    pedestrianSpeed: z.number().positive().max(5),
    pedestrianHealth: z.number().positive(),
    /** Fraction of a car's top speed that traffic cruises at. */
    trafficSpeedFactor: z.number().positive().max(1),
  })
  .refine((population) => population.despawnDistance > population.spawnMinDistance, {
    message: 'despawnDistance must be greater than spawnMinDistance',
    path: ['despawnDistance'],
  });

export type PopulationConfig = z.infer<typeof PopulationConfigSchema>;

export const WeaponsConfigSchema = z.object({
  melee: z.object({
    range: z.number().positive().max(4),
    coneDegrees: z.number().positive().max(180),
    damage: z.number().positive(),
    cooldown: z.number().positive(),
  }),
  pistol: z.object({
    damage: z.number().positive(),
    /** Damage falls to half at this distance and stays there beyond it. */
    maxRange: z.number().positive(),
    fireRate: z.number().positive(),
    magazine: z.number().int().positive(),
    reserveAmmo: z.number().int().nonnegative(),
    reloadTime: z.number().positive(),
  }),
  startingCash: z.number().nonnegative(),
  /** Share of cash lost on death. */
  deathCashPenalty: z.number().min(0).max(1),
  respawnDelay: z.number().positive(),
});

export type WeaponsConfig = z.infer<typeof WeaponsConfigSchema>;
