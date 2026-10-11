import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/event-bus';

interface Events {
  ping: { value: number };
  quiet: Record<string, never>;
}

describe('EventBus', () => {
  it('delivers each payload to every subscriber of that event', () => {
    const bus = new EventBus<Events>();
    const seen: number[] = [];
    bus.on('ping', (payload) => seen.push(payload.value));
    bus.on('ping', (payload) => seen.push(payload.value * 10));
    bus.emit('ping', { value: 2 });
    expect(seen).toEqual([2, 20]);
  });

  it('stops delivering after unsubscribing', () => {
    const bus = new EventBus<Events>();
    let count = 0;
    const unsubscribe = bus.on('ping', () => (count += 1));
    bus.emit('ping', { value: 1 });
    unsubscribe();
    bus.emit('ping', { value: 1 });
    expect(count).toBe(1);
  });

  it('ignores events nobody listens to', () => {
    const bus = new EventBus<Events>();
    expect(() => bus.emit('quiet', {})).not.toThrow();
  });
});
