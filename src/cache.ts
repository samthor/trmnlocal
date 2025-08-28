export class TimeoutCache<K, V> {
  private map = new Map<K, { when: number; timeout: ReturnType<typeof setTimeout>; value: V }>();

  set(key: K, value: V, duration: number) {
    if (duration <= 0.0) {
      return false;
    }

    const when = performance.now() + duration;

    const prev = this.map.get(key);
    if (prev === undefined) {
      const timeout = setTimeout(() => this.map.delete(key), duration);
      this.map.set(key, { when, timeout, value });
      return true;
    }

    if (when < prev.when) {
      return false; // nothing to do
    }

    clearTimeout(prev.timeout);
    prev.when = when;
    prev.timeout = setTimeout(() => this.map.delete(key), duration);
    return true;
  }

  get(key: K): V | undefined {
    return this.map.get(key)?.value;
  }
}
