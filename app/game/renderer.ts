import { BUILDING_SPECS, type Building, type Camera, type CityState } from "./types";
import { WORLD_LIMIT } from "./simulation";

const TAU = Math.PI * 2;
const TILE_W = 74;
const TILE_H = 38;

type Point = { x: number; y: number };

function worldToScreen(x: number, y: number, width: number, height: number, camera: Camera): Point {
  return {
    x: width / 2 + (x - y) * (TILE_W / 2) * camera.zoom + camera.x,
    y: height * 0.54 + (x + y) * (TILE_H / 2) * camera.zoom + camera.y,
  };
}

export function screenToWorld(x: number, y: number, width: number, height: number, camera: Camera): Point {
  const sx = (x - width / 2 - camera.x) / ((TILE_W / 2) * camera.zoom);
  const sy = (y - height * 0.54 - camera.y) / ((TILE_H / 2) * camera.zoom);
  return { x: (sx + sy) / 2, y: (sy - sx) / 2 };
}

function diamond(ctx: CanvasRenderingContext2D, point: Point, width: number, height: number) {
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - height / 2);
  ctx.lineTo(point.x + width / 2, point.y);
  ctx.lineTo(point.x, point.y + height / 2);
  ctx.lineTo(point.x - width / 2, point.y);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function pseudo(seed: number, index: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, state: CityState) {
  const night = state.hour < 6 || state.hour >= 19;
  const dawn = state.hour === 6 || state.hour === 18;
  const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.78);
  if (night) {
    gradient.addColorStop(0, "#07152f");
    gradient.addColorStop(0.48, "#173653");
    gradient.addColorStop(1, "#c47755");
  } else if (dawn) {
    gradient.addColorStop(0, "#173a60");
    gradient.addColorStop(0.62, "#e2a66b");
    gradient.addColorStop(1, "#f6d39b");
  } else {
    gradient.addColorStop(0, "#1785a4");
    gradient.addColorStop(0.56, "#66c7c2");
    gradient.addColorStop(1, "#ffd29b");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const starCount = night ? 46 : 0;
  ctx.fillStyle = "rgba(255,255,220,.72)";
  for (let index = 0; index < starCount; index += 1) {
    const x = pseudo(state.seed, index) * width;
    const y = pseudo(state.seed, index + 90) * height * 0.38;
    ctx.globalAlpha = 0.25 + pseudo(state.seed, index + 180) * 0.65;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  const sunX = width * (0.78 - ((state.hour - 6 + 24) % 24) / 24 * 0.55);
  const sunY = height * (0.17 + Math.abs(12 - state.hour) * 0.018);
  const orbGradient = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, width * 0.15);
  orbGradient.addColorStop(0, night ? "rgba(194,220,255,.95)" : "rgba(255,244,186,.98)");
  orbGradient.addColorStop(0.18, night ? "rgba(163,202,255,.26)" : "rgba(255,241,159,.34)");
  orbGradient.addColorStop(1, "rgba(255,220,126,0)");
  ctx.fillStyle = orbGradient;
  ctx.fillRect(sunX - width * 0.16, sunY - width * 0.16, width * 0.32, width * 0.32);

  ctx.fillStyle = night ? "#dbe8ff" : "#fff1af";
  ctx.beginPath();
  ctx.arc(sunX, sunY, night ? 13 : 18, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.15)";
  for (let index = 0; index < 5; index += 1) {
    const x = width * (0.05 + pseudo(state.seed + 7, index) * 0.9);
    const y = height * (0.14 + pseudo(state.seed + 9, index + 20) * 0.18);
    ctx.beginPath();
    ctx.ellipse(x, y, 45 + pseudo(state.seed, index + 10) * 50, 9, 0, 0, TAU);
    ctx.fill();
  }
}

function drawWater(ctx: CanvasRenderingContext2D, width: number, height: number, state: CityState) {
  const water = ctx.createLinearGradient(0, height * 0.55, width, height);
  water.addColorStop(0, "#0c7891");
  water.addColorStop(0.45, "#105a7c");
  water.addColorStop(1, "#092e50");
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.57);
  ctx.lineTo(width * 0.23, height * 0.52);
  ctx.lineTo(width * 0.42, height * 0.62);
  ctx.lineTo(width * 0.74, height * 0.7);
  ctx.lineTo(width, height * 0.64);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(148,242,239,.22)";
  ctx.lineWidth = 1;
  for (let index = 0; index < 18; index += 1) {
    const y = height * 0.63 + index * 18 + Math.sin(state.tick * 0.08 + index) * 3;
    ctx.beginPath();
    ctx.moveTo(width * (0.02 + (index % 3) * 0.06), y);
    ctx.quadraticCurveTo(width * 0.2, y - 5, width * 0.37, y);
    ctx.stroke();
  }
}

function drawTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, camera: Camera) {
  const ground = ctx.createLinearGradient(0, height * 0.42, width, height);
  ground.addColorStop(0, "#9d8b67");
  ground.addColorStop(0.44, "#6b755c");
  ground.addColorStop(1, "#2f4d50");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.48);
  ctx.lineTo(width * 0.26, height * 0.4);
  ctx.lineTo(width * 0.62, height * 0.55);
  ctx.lineTo(width, height * 0.46);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  for (let x = -WORLD_LIMIT; x <= WORLD_LIMIT; x += 1) {
    for (let y = -WORLD_LIMIT; y <= WORLD_LIMIT; y += 1) {
      const point = worldToScreen(x, y, width, height, camera);
      diamond(ctx, point, TILE_W * camera.zoom * 0.98, TILE_H * camera.zoom * 0.98);
      ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(211,187,123,.09)" : "rgba(27,78,71,.10)";
      ctx.fill();
      ctx.strokeStyle = "rgba(226,215,164,.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function roadLine(ctx: CanvasRenderingContext2D, width: number, height: number, camera: Camera, axis: "x" | "y", offset: number) {
  const start = axis === "x" ? worldToScreen(-WORLD_LIMIT, offset, width, height, camera) : worldToScreen(offset, -WORLD_LIMIT, width, height, camera);
  const end = axis === "x" ? worldToScreen(WORLD_LIMIT, offset, width, height, camera) : worldToScreen(offset, WORLD_LIMIT, width, height, camera);
  ctx.strokeStyle = "rgba(22,39,47,.84)";
  ctx.lineWidth = 12 * camera.zoom;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(246,211,137,.47)";
  ctx.lineWidth = 1.2 * camera.zoom;
  ctx.setLineDash([8 * camera.zoom, 8 * camera.zoom]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRoads(ctx: CanvasRenderingContext2D, width: number, height: number, camera: Camera) {
  [-5, -2, 1, 4].forEach((offset) => roadLine(ctx, width, height, camera, "x", offset));
  [-4, -1, 2, 5].forEach((offset) => roadLine(ctx, width, height, camera, "y", offset));
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number) {
  ctx.fillStyle = "#3a5943";
  ctx.fillRect(x - 2 * scale, y - 17 * scale, 4 * scale, 17 * scale);
  const color = seed % 2 === 0 ? "#6db36f" : "#4e9366";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 23 * scale, 11 * scale, 0, TAU);
  ctx.arc(x - 8 * scale, y - 15 * scale, 8 * scale, 0, TAU);
  ctx.arc(x + 8 * scale, y - 15 * scale, 8 * scale, 0, TAU);
  ctx.fill();
}

function drawPrism(ctx: CanvasRenderingContext2D, point: Point, width: number, depth: number, height: number, color: string, accent: string) {
  const left: Point = { x: point.x - width / 2, y: point.y - depth / 2 };
  const right: Point = { x: point.x + width / 2, y: point.y - depth / 2 };
  const front: Point = { x: point.x, y: point.y + depth / 2 };
  const top: Point = { x: point.x, y: point.y - height - depth / 2 };
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, top.y + depth / 2);
  ctx.lineTo(front.x, top.y + depth);
  ctx.lineTo(left.x, top.y + depth / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(11,28,45,.52)";
  ctx.beginPath();
  ctx.moveTo(left.x, top.y + depth / 2);
  ctx.lineTo(front.x, top.y + depth);
  ctx.lineTo(front.x, point.y + depth / 2);
  ctx.lineTo(left.x, point.y - depth / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.beginPath();
  ctx.moveTo(right.x, top.y + depth / 2);
  ctx.lineTo(front.x, top.y + depth);
  ctx.lineTo(front.x, point.y + depth / 2);
  ctx.lineTo(right.x, point.y - depth / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.36;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  return top;
}

function drawWindows(ctx: CanvasRenderingContext2D, x: number, y: number, columns: number, rows: number, scale: number, color: string) {
  ctx.fillStyle = color;
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      ctx.globalAlpha = 0.42 + ((column + row) % 3) * 0.12;
      ctx.fillRect(x + column * 8 * scale, y + row * 10 * scale, 4 * scale, 5 * scale);
    }
  }
  ctx.globalAlpha = 1;
}

function drawBuilding(ctx: CanvasRenderingContext2D, building: Building, width: number, height: number, camera: Camera, state: CityState, selected: boolean) {
  const point = worldToScreen(building.x, building.y, width, height, camera);
  const spec = BUILDING_SPECS[building.kind];
  const scale = camera.zoom;
  const baseWidth = 36 * scale + building.level * 3 * scale;
  const baseDepth = 21 * scale + building.level * 1.5 * scale;
  const shadow = ctx.createRadialGradient(point.x, point.y + 7 * scale, 2, point.x, point.y + 7 * scale, 38 * scale);
  shadow.addColorStop(0, "rgba(2,14,24,.48)");
  shadow.addColorStop(1, "rgba(2,14,24,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(point.x, point.y + 7 * scale, 43 * scale, 15 * scale, 0, 0, TAU);
  ctx.fill();

  if (building.kind === "park") {
    diamond(ctx, point, 54 * scale, 28 * scale);
    ctx.fillStyle = "#2d815e";
    ctx.fill();
    ctx.strokeStyle = "rgba(189,255,183,.55)";
    ctx.stroke();
    for (let index = 0; index < 5 + building.level; index += 1) {
      drawTree(ctx, point.x + (pseudo(building.builtAt + 5, index) - 0.5) * 38 * scale, point.y - 2 * scale + pseudo(building.builtAt + 8, index + 20) * 8 * scale, 0.56 * scale, index);
    }
  } else if (building.kind === "solar") {
    diamond(ctx, point, 58 * scale, 28 * scale);
    ctx.fillStyle = "#67785d";
    ctx.fill();
    for (let index = -1; index <= 1; index += 1) {
      const panelX = point.x + index * 14 * scale;
      ctx.fillStyle = "#173b61";
      ctx.beginPath();
      ctx.moveTo(panelX - 12 * scale, point.y - 7 * scale - index * 2 * scale);
      ctx.lineTo(panelX + 10 * scale, point.y - 7 * scale - index * 2 * scale);
      ctx.lineTo(panelX + 7 * scale, point.y - 18 * scale - index * 2 * scale);
      ctx.lineTo(panelX - 15 * scale, point.y - 18 * scale - index * 2 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(182,238,255,.7)";
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.beginPath();
      ctx.moveTo(panelX - 9 * scale, point.y - 17 * scale - index * 2 * scale);
      ctx.lineTo(panelX + 6 * scale, point.y - 8 * scale - index * 2 * scale);
      ctx.stroke();
    }
  } else if (building.kind === "water" || building.kind === "desalination") {
    const top = drawPrism(ctx, point, baseWidth * 1.15, baseDepth * 1.15, 37 * scale, spec.color, spec.accent);
    ctx.fillStyle = "rgba(165,245,255,.7)";
    ctx.beginPath();
    ctx.arc(top.x, top.y + 3 * scale, 9 * scale, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(top.x, top.y + 3 * scale, 13 * scale, Math.PI, TAU);
    ctx.stroke();
    if (building.kind === "desalination") {
      ctx.strokeStyle = "rgba(200,250,255,.64)";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(point.x - 17 * scale, point.y - 4 * scale);
      ctx.lineTo(point.x + 17 * scale, point.y - 4 * scale);
      ctx.stroke();
    }
  } else if (building.kind === "factory") {
    drawPrism(ctx, point, baseWidth * 1.34, baseDepth * 1.25, 34 * scale, spec.color, spec.accent);
    ctx.fillStyle = "#324551";
    ctx.fillRect(point.x - 12 * scale, point.y - 43 * scale, 8 * scale, 25 * scale);
    ctx.fillRect(point.x + 6 * scale, point.y - 50 * scale, 8 * scale, 32 * scale);
    ctx.fillStyle = "rgba(230,234,220,.17)";
    ctx.beginPath();
    ctx.arc(point.x - 8 * scale, point.y - 47 * scale, 10 * scale, 0, TAU);
    ctx.arc(point.x + 10 * scale, point.y - 57 * scale, 12 * scale, 0, TAU);
    ctx.fill();
    drawWindows(ctx, point.x - 17 * scale, point.y - 23 * scale, 4, 2, scale, spec.accent);
  } else if (building.kind === "hospital") {
    drawPrism(ctx, point, baseWidth * 1.18, baseDepth * 1.12, 47 * scale, spec.color, spec.accent);
    ctx.fillStyle = "#d9fff4";
    ctx.fillRect(point.x - 5 * scale, point.y - 44 * scale, 10 * scale, 27 * scale);
    ctx.fillRect(point.x - 14 * scale, point.y - 35 * scale, 28 * scale, 9 * scale);
    drawWindows(ctx, point.x - 16 * scale, point.y - 17 * scale, 4, 2, scale, "#c8fff0");
  } else if (building.kind === "transit") {
    drawPrism(ctx, point, baseWidth * 1.26, baseDepth * 1.05, 22 * scale, spec.color, spec.accent);
    ctx.fillStyle = "#e9c575";
    ctx.fillRect(point.x - 18 * scale, point.y - 25 * scale, 36 * scale, 3 * scale);
    ctx.fillStyle = "#4a3332";
    ctx.fillRect(point.x - 16 * scale, point.y - 20 * scale, 32 * scale, 6 * scale);
  } else {
    drawPrism(ctx, point, baseWidth, baseDepth, (39 + building.level * 7) * scale, spec.color, spec.accent);
    drawWindows(ctx, point.x - 15 * scale, point.y - (35 + building.level * 7) * scale, 4, Math.min(4, building.level + 1), scale, spec.accent);
    ctx.fillStyle = "#4a667b";
    ctx.fillRect(point.x - 5 * scale, point.y - 21 * scale, 10 * scale, 18 * scale);
  }

  if (selected) {
    ctx.strokeStyle = "rgba(196,255,234,.96)";
    ctx.lineWidth = 2.2 * scale;
    ctx.setLineDash([5 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 5 * scale, 34 * scale, 13 * scale, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.arc(point.x, point.y - 59 * scale, 4 * scale, 0, TAU);
    ctx.fill();
  }
}

function drawCars(ctx: CanvasRenderingContext2D, width: number, height: number, camera: Camera, state: CityState) {
  const lanes = [-5, -2, 1, 4];
  for (let index = 0; index < 12; index += 1) {
    const lane = lanes[index % lanes.length];
    const progress = ((state.tick * (0.018 + (index % 3) * 0.006) + index * 0.23) % 1) * (index % 2 === 0 ? 1 : -1);
    const x = -WORLD_LIMIT + progress * WORLD_LIMIT * 2;
    const point = worldToScreen(x, lane + (index % 2 ? 0.08 : -0.08), width, height, camera);
    ctx.save();
    ctx.translate(point.x, point.y - 4 * camera.zoom);
    ctx.rotate(index % 2 ? -0.48 : 0.48);
    ctx.fillStyle = index % 3 === 0 ? "#f6ba5b" : index % 3 === 1 ? "#e47772" : "#8ee3e7";
    roundRect(ctx, -5 * camera.zoom, -3 * camera.zoom, 10 * camera.zoom, 5 * camera.zoom, 2 * camera.zoom);
    ctx.fill();
    ctx.restore();
  }
}

function drawWeather(ctx: CanvasRenderingContext2D, width: number, height: number, state: CityState) {
  if (state.weather === "heat") {
    ctx.fillStyle = "rgba(255,183,84,.06)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,234,157,.12)";
    ctx.lineWidth = 2;
    for (let index = 0; index < 8; index += 1) {
      const x = width * (0.08 + index * 0.12);
      ctx.beginPath();
      ctx.moveTo(x, height * 0.44);
      ctx.quadraticCurveTo(x + 12, height * 0.5, x - 6, height * 0.56);
      ctx.stroke();
    }
  }
  if (state.weather === "storm") {
    ctx.fillStyle = "rgba(24,45,72,.18)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(180,232,255,.42)";
    ctx.lineWidth = 1;
    for (let index = 0; index < 80; index += 1) {
      const x = pseudo(state.seed + state.tick, index) * width;
      const y = pseudo(state.seed + state.tick, index + 100) * height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 13);
      ctx.stroke();
    }
  }
}

export function renderCity(ctx: CanvasRenderingContext2D, width: number, height: number, state: CityState, camera: Camera, selectedId: string | null, preview?: { x: number; y: number; valid: boolean } | null) {
  ctx.clearRect(0, 0, width, height);
  drawSky(ctx, width, height, state);
  drawWater(ctx, width, height, state);
  drawTerrain(ctx, width, height, camera);
  drawRoads(ctx, width, height, camera);

  const buildings = [...state.buildings].sort((first, second) => first.x + first.y - (second.x + second.y));
  buildings.forEach((building) => drawBuilding(ctx, building, width, height, camera, state, building.id === selectedId));
  drawCars(ctx, width, height, camera, state);

  if (preview) {
    const point = worldToScreen(preview.x, preview.y, width, height, camera);
    ctx.globalAlpha = 0.66;
    ctx.fillStyle = preview.valid ? "#9af5a7" : "#ff8c8c";
    diamond(ctx, point, 54 * camera.zoom, 28 * camera.zoom);
    ctx.fill();
    ctx.strokeStyle = preview.valid ? "#d9ffe0" : "#ffd2d2";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawWeather(ctx, width, height, state);
  const vignette = ctx.createRadialGradient(width / 2, height * 0.45, width * 0.15, width / 2, height * 0.5, width * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(2,10,22,.48)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

export function pickBuilding(x: number, y: number, width: number, height: number, state: CityState, camera: Camera): string | null {
  const candidates = [...state.buildings].sort((first, second) => second.x + second.y - (first.x + first.y));
  for (const building of candidates) {
    const point = worldToScreen(building.x, building.y, width, height, camera);
    const distance = Math.hypot(point.x - x, point.y - y);
    const radius = (30 + building.level * 5) * camera.zoom;
    if (distance <= radius) return building.id;
  }
  return null;
}

export function snapWorld(point: Point): Point {
  return { x: Math.round(point.x * 2) / 2, y: Math.round(point.y * 2) / 2 };
}
