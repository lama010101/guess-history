type Entry<V> = { key: string; value: V };

export class LRUCache<V> {
  private max: number;
  private map = new Map<string, V>();

  constructor(max = 100) {
    this.max = max;
  }

  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      // refresh order
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }

  set(key: string, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      // delete LRU (first)
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }

  entries(): Entry<V>[] {
    return Array.from(this.map, ([key, value]) => ({ key, value }));
  }

  load(entries: Entry<V>[]) {
    for (const e of entries) this.set(e.key, e.value);
  }
}
