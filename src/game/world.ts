import type { ControlState } from '../core/controls';
import type { GameConfig } from '../data/load-config';
import { Player, stepOnFoot } from '../entities/player';
import { buildCityCollision } from '../world/city-collision';
import { generateCity, type CityLayout } from '../world/city-generator';
import type { CollisionWorld } from '../world/collision-world';

/**
 * Simulation state for one city: the layout, its colliders, and the player. It has no DOM or
 * GPU dependencies, so tests can step it directly.
 */
export class World {
  readonly layout: CityLayout;
  readonly collision: CollisionWorld;
  readonly player: Player;

  constructor(config: GameConfig) {
    this.layout = generateCity(config.city);
    this.collision = buildCityCollision(this.layout);
    const spawn = this.layout.graph.nearestNode(0, 0).position;
    this.player = new Player(spawn, config.player);
  }

  /** Advances the simulation by one fixed step. */
  step(dt: number, controls: ControlState): void {
    this.player.beginStep();
    stepOnFoot(this.player, controls, dt, this.collision);
  }
}
