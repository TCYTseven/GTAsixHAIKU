type Handler = (payload: unknown) => void;

/**
 * Typed publish and subscribe. Systems announce what happened (an impact, a crime, a pickup) and
 * other systems react, instead of calling each other directly.
 */
export class EventBus<Events extends object> {
  private readonly handlers = new Map<keyof Events, Set<Handler>>();

  /** Subscribes to an event. Returns a function that unsubscribes. */
  on<K extends keyof Events>(type: K, handler: (payload: Events[K]) => void): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    const stored = handler as Handler;
    set.add(stored);
    return () => {
      this.handlers.get(type)?.delete(stored);
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers.get(type);
    if (!set) {
      return;
    }
    for (const handler of set) {
      handler(payload);
    }
  }
}
