// Automatic proximity grouping: dice whose centers sit close together
// form a cluster (union-find). Clusters of 2+ get a subtotal chip.

import { DIE_SIZE } from './dice.js';

const THRESHOLD = DIE_SIZE * 1.5;

export function computeClusters(dice) {
  const n = dice.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { parent[find(a)] = find(b); };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = dice[i].x - dice[j].x;
      const dy = dice[i].y - dice[j].y;
      if (Math.hypot(dx, dy) < THRESHOLD) union(i, j);
    }
  }

  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(dice[i]);
  }
  return [...groups.values()];
}

// Anchor point for a cluster's subtotal chip: centered above its top die.
export function chipAnchor(cluster) {
  let minY = Infinity, sumX = 0;
  for (const d of cluster) {
    if (d.y < minY) minY = d.y;
    sumX += d.x + DIE_SIZE / 2;
  }
  return { x: sumX / cluster.length, y: minY - 6 };
}
