import { describe, expect, it } from 'vitest';
import { buildRoadGraph } from '../../src/world/road-graph';

// Three streets in each direction, 60 m apart: a 2 by 2 grid of blocks.
const LINES = [0, 60, 120];
const graph = buildRoadGraph(LINES, 3.5);

describe('RoadGraph', () => {
  it('has one node per intersection and two lanes per direction on every segment', () => {
    expect(graph.nodes).toHaveLength(9);
    // 2 axes x 3 streets x 2 segments x 2 directions x 2 lanes.
    expect(graph.edges).toHaveLength(48);
  });

  it('drives on the right: heading +X keeps to +Z, and heading +Z keeps to -X', () => {
    for (const edge of graph.edges) {
      const from = graph.nodes[edge.from].position;
      const dx = edge.end.x - edge.start.x;
      const dz = edge.end.z - edge.start.z;
      if (Math.abs(dx) > 1e-9) {
        expect(Math.sign(edge.start.z - from.z)).toBe(Math.sign(dx));
      } else {
        expect(Math.sign(edge.start.x - from.x)).toBe(-Math.sign(dz));
      }
    }
  });

  it('gives headings that match each edge direction', () => {
    for (const edge of graph.edges) {
      const dx = edge.end.x - edge.start.x;
      const dz = edge.end.z - edge.start.z;
      const length = Math.hypot(dx, dz);
      const along = (Math.sin(edge.heading) * dx + Math.cos(edge.heading) * dz) / length;
      expect(along).toBeCloseTo(1, 9);
    }
  });

  it('plans a route between opposite corners along the grid', () => {
    const path = graph.findPath(0, 8);
    expect(path).not.toBeNull();
    expect(path?.[0]).toBe(0);
    expect(path?.at(-1)).toBe(8);

    let length = 0;
    for (let i = 1; i < (path?.length ?? 0); i++) {
      length += graph.nodes[path![i - 1]].position.distanceTo(graph.nodes[path![i]].position);
    }
    // Manhattan distance between (0, 0) and (120, 120).
    expect(length).toBeCloseTo(240, 6);
  });

  it('returns a single node when start and goal are the same', () => {
    expect(graph.findPath(4, 4)).toEqual([4]);
  });

  it('finds the nearest intersection to a point', () => {
    expect(graph.nearestNode(58, 3).position.x).toBe(60);
    expect(graph.nearestNode(58, 3).position.z).toBe(0);
  });
});
