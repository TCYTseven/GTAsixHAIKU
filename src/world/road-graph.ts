import { minBy } from 'lodash-es';
import { Vec3 } from '../math/vec3';

export interface RoadNode {
  readonly id: number;
  readonly col: number;
  readonly row: number;
  readonly position: Vec3;
  /** Ids of the edges that leave this intersection. */
  readonly outgoing: readonly number[];
}

export interface RoadEdge {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  /** 0 is the curb lane, 1 is the lane beside the centerline. */
  readonly lane: number;
  readonly start: Vec3;
  readonly end: Vec3;
  readonly length: number;
  /** Yaw of travel. A yaw of 0 faces +Z, as in `mat4FromTransform`. */
  readonly heading: number;
}

/**
 * Directed lane graph of the street grid: one node per intersection and one edge per lane per
 * direction. Traffic and police drive along edges, and A* over nodes plans routes.
 */
export class RoadGraph {
  constructor(
    readonly nodes: readonly RoadNode[],
    readonly edges: readonly RoadEdge[],
  ) {}

  nearestNode(x: number, z: number): RoadNode {
    const node = minBy(this.nodes, (candidate) => {
      const dx = candidate.position.x - x;
      const dz = candidate.position.z - z;
      return dx * dx + dz * dz;
    });
    if (!node) {
      throw new Error('The road graph has no intersections.');
    }
    return node;
  }

  /**
   * Shortest route between two intersections, as node ids from start to goal. Returns null when
   * no route exists.
   */
  findPath(startId: number, goalId: number): number[] | null {
    if (startId === goalId) {
      return [startId];
    }
    const goal = this.nodes[goalId].position;
    const cost = new Map<number, number>([[startId, 0]]);
    const cameFrom = new Map<number, number>();
    const open = new Set<number>([startId]);
    const closed = new Set<number>();

    while (open.size > 0) {
      const current = minBy(
        [...open],
        (id) => (cost.get(id) ?? Infinity) + this.nodes[id].position.distanceTo(goal),
      );
      if (current === undefined) {
        break;
      }
      if (current === goalId) {
        return reconstructPath(cameFrom, current);
      }
      open.delete(current);
      closed.add(current);

      const currentCost = cost.get(current) ?? Infinity;
      for (const edgeId of this.nodes[current].outgoing) {
        const edge = this.edges[edgeId];
        if (closed.has(edge.to)) {
          continue;
        }
        const tentative = currentCost + edge.length;
        if (tentative < (cost.get(edge.to) ?? Infinity)) {
          cameFrom.set(edge.to, current);
          cost.set(edge.to, tentative);
          open.add(edge.to);
        }
      }
    }
    return null;
  }
}

/**
 * Builds the lane graph for a square grid of streets. `lines` are the street centerline
 * coordinates, shared by the X and Z directions. Each direction carries two lanes.
 */
export function buildRoadGraph(lines: readonly number[], laneWidth: number): RoadGraph {
  const count = lines.length;
  const last = count - 1;
  const nodeId = (col: number, row: number): number => row * count + col;

  const outgoing: number[][] = Array.from({ length: count * count }, () => []);
  const nodes: RoadNode[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      const id = nodeId(col, row);
      nodes.push({
        id,
        col,
        row,
        position: new Vec3(lines[col], 0, lines[row]),
        outgoing: outgoing[id],
      });
    }
  }

  const edges: RoadEdge[] = [];
  const addEdge = (from: number, to: number, lane: number, start: Vec3, end: Vec3): void => {
    const id = edges.length;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    edges.push({
      id,
      from,
      to,
      lane,
      start,
      end,
      length: Math.hypot(dx, dz),
      heading: Math.atan2(dx, dz),
    });
    outgoing[from].push(id);
  };

  // Lane centers sit at 1 and 3 half-lane-widths from the centerline.
  const laneOffsets = [laneWidth / 2, (3 * laneWidth) / 2];

  // Streets running along X sit at a fixed z. Right-hand traffic keeps to +Z when heading +X.
  for (let row = 0; row < count; row++) {
    const z = lines[row];
    for (let col = 0; col < last; col++) {
      for (let lane = 0; lane < laneOffsets.length; lane++) {
        const offset = laneOffsets[lane];
        addEdge(
          nodeId(col, row),
          nodeId(col + 1, row),
          lane,
          new Vec3(lines[col], 0, z + offset),
          new Vec3(lines[col + 1], 0, z + offset),
        );
        addEdge(
          nodeId(col + 1, row),
          nodeId(col, row),
          lane,
          new Vec3(lines[col + 1], 0, z - offset),
          new Vec3(lines[col], 0, z - offset),
        );
      }
    }
  }

  // Streets running along Z sit at a fixed x. Heading +Z keeps to -X (the right-hand side).
  for (let col = 0; col < count; col++) {
    const x = lines[col];
    for (let row = 0; row < last; row++) {
      for (let lane = 0; lane < laneOffsets.length; lane++) {
        const offset = laneOffsets[lane];
        addEdge(
          nodeId(col, row),
          nodeId(col, row + 1),
          lane,
          new Vec3(x - offset, 0, lines[row]),
          new Vec3(x - offset, 0, lines[row + 1]),
        );
        addEdge(
          nodeId(col, row + 1),
          nodeId(col, row),
          lane,
          new Vec3(x + offset, 0, lines[row + 1]),
          new Vec3(x + offset, 0, lines[row]),
        );
      }
    }
  }

  return new RoadGraph(nodes, edges);
}

function reconstructPath(cameFrom: Map<number, number>, end: number): number[] {
  const path = [end];
  let previous = cameFrom.get(end);
  while (previous !== undefined) {
    path.push(previous);
    previous = cameFrom.get(previous);
  }
  return path.reverse();
}
