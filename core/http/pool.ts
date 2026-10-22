export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function limit(n: number) {
  let active = 0;
  const queue: { rank: number; go: () => void }[] = [];
  const next = () => {
    const i = queue.reduce((best, q, j) => (q.rank < queue[best].rank ? j : best), 0);
    return queue.splice(i, 1)[0];
  };
  return async <R>(fn: () => Promise<R>, rank = 0): Promise<R> => {
    if (active < n) active++;
    else await new Promise<void>((go) => queue.push({ rank, go }));
    try {
      return await fn();
    } finally {
      if (queue.length) next().go();
      else active--;
    }
  };
}

export function mapPool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>) {
  const gate = limit(n);
  return Promise.all(items.map((item) => gate(() => fn(item))));
}
