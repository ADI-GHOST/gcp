const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const info = document.getElementById('infoText');

const palette = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'
];

let adj = [], N = 0, nodes = [];

/* ------- Parse Matrix ------- */
function parseMatrix() {
  const txt = document.getElementById('matrixInput').value.trim();
  const lines = txt.split(/\r?\n/).filter(Boolean);
  N = lines.length;
  adj = Array.from({ length: N }, () => Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    const vals = lines[i].split(/\s+/).map(Number);
    for (let j = 0; j < N; j++) adj[i][j] = vals[j] || 0;
  }

  computePositions();
  draw([]);
  info.textContent = `Parsed N = ${N}`;
}

/* ------- Node Positions ------- */
function computePositions() {
  nodes = [];
  const cx = canvas.width / 2,
        cy = canvas.height / 2,
        r = Math.min(cx, cy) - 80;

  for (let i = 0; i < N; i++) {
    const a = (i / N) * 2 * Math.PI - Math.PI / 2;
    nodes.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
}

/* ------- Random Graph ------- */
function randomGraph() {
  const n = 5 + Math.floor(Math.random() * 5);
  N = n;
  adj = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < 0.4) adj[i][j] = adj[j][i] = 1;
    }
  }

  const text = adj.map(r => r.join(' ')).join('\n');
  document.getElementById('matrixInput').value = text;

  computePositions();
  draw([]);

  info.textContent = `Random graph (N=${N}) ready`;
}

/* ------- Drawing Graph ------- */
function draw(colors, highlight = -1) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // edges
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (adj[i][j]) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  // nodes
  for (let i = 0; i < N; i++) {
    const p = nodes[i];
    const c = colors[i];

    ctx.beginPath();
    ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = c >= 0 ? palette[c % palette.length] : '#1e293b';
    ctx.fill();

    if (i === highlight) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i, p.x, p.y);
  }
}

/* ---------------------------------------------------------
   PURE BRANCH & BOUND (NO DSATUR)
--------------------------------------------------------- */
async function runBB() {
  const V = N;
  const color = Array(V).fill(-1);

  let UB = V;
  let bestColor = Array(V).fill(-1);

  function isValid(v, c) {
    for (let u = 0; u < V; u++) {
      if (adj[v][u] && color[u] === c) return false;
    }
    return true;
  }

  function lowerBound() {
    const used = Math.max(...color);
    return used + 1;
  }

  async function dfs(v) {
    if (v === V) {
      const used = Math.max(...color) + 1;
      if (used < UB) {
        UB = used;
        bestColor = [...color];
        info.textContent = `Found better solution → ${used} colors`;
        draw(color);
        await sleep(600);
      }
      return;
    }

    const LB = lowerBound();
    if (LB >= UB) return;

    for (let c = 0; c < UB; c++) {
      if (isValid(v, c)) {
        color[v] = c;
        draw(color, v);
        info.textContent = `Trying v=${v} → c=${c}`;
        await sleep(350);

        await dfs(v + 1);
        color[v] = -1;
      }
    }
  }

  info.textContent = "Running Branch & Bound...";
  await dfs(0);

  draw(bestColor);
  info.textContent = `Optimal Coloring = ${UB} colors`;
}

/* ---------------------------------------------------------
   BRUTE FORCE (your original)
--------------------------------------------------------- */
async function runBrute() {
  const V = N;
  const cur = Array(V).fill(-1);

  function valid(v, c) {
    for (let u = 0; u < V; u++) if (adj[v][u] && cur[u] === c) return false;
    return true;
  }

  async function backtrack(v, k) {
    if (v === V) return true;

    for (let c = 0; c < k; c++) {
      if (valid(v, c)) {
        cur[v] = c;
        draw(cur, v);
        info.textContent = `Try v=${v} → c=${c}`;
        await sleep(700);

        if (await backtrack(v + 1, k)) return true;

        cur[v] = -1;
        draw(cur, v);
        info.textContent = `Backtrack v=${v}`;
        await sleep(500);
      }
    }
    return false;
  }

  info.textContent = 'Running brute-force...';

  for (let k = 1; k <= V; k++) {
    info.textContent = `Trying with ${k} colors...`;
    if (await backtrack(0, k)) {
      info.textContent = `Found valid coloring with ${k} colors!`;
      draw(cur);
      return;
    }
  }
  info.textContent = 'No valid coloring found.';
}

/* ------- Utilities ------- */
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/* ------- Buttons ------- */
document.getElementById('parseBtn').onclick = parseMatrix;
document.getElementById('randBtn').onclick = randomGraph;
document.getElementById('dsaturBtn').onclick = runBB;  // now B&B
document.getElementById('bruteBtn').onclick = runBrute;

/* Initialize with default */
parseMatrix();
