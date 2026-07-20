// Die model: shapes, colors, unbiased rolls.
// Shapes are skeuomorphic: each die is drawn with gradient-shaded facets
// (light from the top-left) so it reads like a real polyhedral seen head-on.

export const DIE_SIZE = 64;
export const STANDARD = [4, 6, 8, 10, 12, 20, 100];

export const COLORS = [
  '#a02416', // EBC red
  '#f9f4e2', // cream
  '#2a2624', // charcoal
  '#2b5b8a', // blue
  '#3c7a3f', // green
  '#6b4a8a', // purple
  '#c77b28', // orange
  '#d4b13c', // gold
];

export function rollValue(sides) {
  // rejection sampling keeps every face equally likely
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / sides) * sides;
  let x;
  do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
  return (x % sides) + 1;
}

let nextId = 1;
export function createDie(sides, color, x, y) {
  return {
    id: `die-${Date.now().toString(36)}-${nextId++}`,
    sides, color, x, y,
    value: rollValue(sides),
    locked: false,
  };
}

// Dark numeral on light dice, cream numeral on dark dice.
export function textColorFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 140 ? '#121010' : '#f9f4e2';
}

// Mix a hex color toward white (pct > 0) or black (pct < 0).
export function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (pct >= 0) {
    r += (255 - r) * pct; g += (255 - g) * pct; b += (255 - b) * pct;
  } else {
    r *= 1 + pct; g *= 1 + pct; b *= 1 + pct;
  }
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function regularPolygon(n, cx, cy, r, rotDeg) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2 + (rotDeg * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
const P = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export function dieShapeSVG(sides, color) {
  const key = `${sides}-${color.slice(1)}`;
  const LL = shade(color, 0.22);   // brightest facet
  const L = shade(color, 0.1);
  const D = shade(color, -0.12);
  const DD = shade(color, -0.22);  // darkest facet
  const edge = shade(color, -0.4);
  const inner = `stroke="${edge}" stroke-width="0.8" stroke-linejoin="round"`;
  const rim = `stroke="${edge}" stroke-width="1.6" stroke-linejoin="round"`;

  // shared gradients: bevel (linear TL->BR) and face (radial, lit center)
  const defs =
    `<defs>` +
    `<linearGradient id="b${key}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${LL}"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="${DD}"/>` +
    `</linearGradient>` +
    `<radialGradient id="f${key}" cx="0.38" cy="0.32" r="0.95">` +
    `<stop offset="0" stop-color="${shade(color, 0.06)}"/><stop offset="1" stop-color="${shade(color, -0.05)}"/>` +
    `</radialGradient>` +
    `</defs>`;

  let body;
  switch (sides) {
    case 4: {
      // three facets meeting at the centroid; number lives on the bottom one
      body =
        `<polygon points="32,4 61,58 3,58" fill="${DD}" ${rim}/>` +
        `<polygon points="32,4 3,58 32,38" fill="${LL}" ${inner}/>` +
        `<polygon points="32,4 61,58 32,38" fill="${D}" ${inner}/>` +
        `<polygon points="3,58 61,58 32,38" fill="url(#f${key})" ${inner}/>`;
      break;
    }
    case 6: {
      body =
        `<rect x="4" y="4" width="56" height="56" rx="6" fill="url(#b${key})" ${rim}/>` +
        `<rect x="9.5" y="9.5" width="45" height="45" rx="4" fill="url(#f${key})"/>`;
      break;
    }
    case 8: {
      // beveled diamond: four rim facets around a central kite face
      body =
        `<polygon points="32,2 62,32 32,62 2,32" fill="${DD}" ${rim}/>` +
        `<polygon points="32,2 2,32 11,32 32,11" fill="${LL}" ${inner}/>` +
        `<polygon points="32,2 62,32 53,32 32,11" fill="${L}" ${inner}/>` +
        `<polygon points="2,32 32,62 32,53 11,32" fill="${D}" ${inner}/>` +
        `<polygon points="62,32 32,62 32,53 53,32" fill="${DD}" ${inner}/>` +
        `<polygon points="32,11 53,32 32,53 11,32" fill="url(#f${key})" ${inner}/>`;
      break;
    }
    case 10: {
      // kite with four rim facets around a central kite face
      body =
        `<polygon points="32,2 59,25 32,62 5,25" fill="${DD}" ${rim}/>` +
        `<polygon points="32,2 5,25 14,27 32,11" fill="${LL}" ${inner}/>` +
        `<polygon points="32,2 59,25 50,27 32,11" fill="${L}" ${inner}/>` +
        `<polygon points="5,25 32,62 32,53 14,27" fill="${D}" ${inner}/>` +
        `<polygon points="59,25 32,62 32,53 50,27" fill="${DD}" ${inner}/>` +
        `<polygon points="32,11 50,27 32,53 14,27" fill="url(#f${key})" ${inner}/>`;
      break;
    }
    case 12: {
      const outer = regularPolygon(5, 32, 33, 30, 0);
      const face = regularPolygon(5, 32, 33, 16.5, 36);
      body =
        `<polygon points="${P(outer)}" fill="url(#b${key})" ${rim}/>` +
        outer.map((v, i) => {
          const u = face[(i + 2) % 5];
          return `<line x1="${v[0].toFixed(1)}" y1="${v[1].toFixed(1)}" x2="${u[0].toFixed(1)}" y2="${u[1].toFixed(1)}" ${inner}/>`;
        }).join('') +
        `<polygon points="${P(face)}" fill="url(#f${key})" ${inner}/>`;
      break;
    }
    case 20: {
      // classic icosahedron head-on: hexagon silhouette, triangular front face
      const [v0, v1, v2, v3, v4, v5] = regularPolygon(6, 32, 32, 30, 0);
      body =
        `<polygon points="${P([v0, v1, v2, v3, v4, v5])}" fill="${D}" ${rim}/>` +
        `<polygon points="${P([v0, v1, v2])}" fill="${L}" ${inner}/>` +
        `<polygon points="${P([v2, v3, v4])}" fill="${DD}" ${inner}/>` +
        `<polygon points="${P([v4, v5, v0])}" fill="${LL}" ${inner}/>` +
        `<polygon points="${P([v0, v2, v4])}" fill="url(#f${key})" ${inner}/>`;
      break;
    }
    case 100: {
      body =
        `<circle cx="32" cy="32" r="29" fill="url(#b${key})" ${rim}/>` +
        `<circle cx="32" cy="32" r="23.5" fill="url(#f${key})"/>`;
      break;
    }
    default: {
      // custom dN: barrel die — elongated flat-top hexagon, distinct from every
      // standard shape (the d20 hexagon is regular and point-up)
      body =
        `<polygon points="15,9 49,9 60,32 49,55 15,55 4,32" fill="url(#b${key})" ${rim}/>` +
        `<polygon points="19,15 45,15 53.5,32 45,49 19,49 10.5,32" fill="url(#f${key})" ${inner}/>`;
    }
  }

  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${body}</svg>`;
}
