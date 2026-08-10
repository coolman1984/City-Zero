import {
  BUILDING_SPECS,
  type Building,
  type BuildingKind,
  type CityState,
  type DecisionId,
  type PolicyId,
  type Relationship,
} from "./types";

export const SAVE_VERSION = 1;
export const WORLD_LIMIT = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function nextRandom(seed: number): number {
  let value = (seed + 0x6d2b79f5) | 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function makeBuilding(kind: BuildingKind, id: string, x: number, y: number, builtAt: number): Building {
  return { id, kind, x, y, level: 1, condition: 100, builtAt };
}

function relationship(id: string, name: string, role: string, trust: number, influence: number, memory: string, color: string): Relationship {
  return { id, name, role, trust, influence, memory, color };
}

export function createInitialCity(seed = 3721): CityState {
  return {
    saveVersion: SAVE_VERSION,
    seed,
    tick: 0,
    day: 1,
    hour: 7,
    money: 18500,
    water: 58,
    energy: 64,
    population: 312,
    jobs: 238,
    satisfaction: 76,
    pollution: 22,
    health: 81,
    traffic: 34,
    weather: "clear",
    weatherTicks: 0,
    speed: 1,
    paused: false,
    buildings: [
      makeBuilding("solar", "bld-solar-01", -4.3, -2.3, 0),
      makeBuilding("water", "bld-water-01", 0.2, -4.3, 0),
      makeBuilding("factory", "bld-factory-01", 3.1, 0.3, 0),
      makeBuilding("homes", "bld-home-01", -2.2, 2.6, 0),
      makeBuilding("homes", "bld-home-02", 0.3, 3.6, 0),
      makeBuilding("hospital", "bld-hospital-01", 3.2, -3.2, 0),
      makeBuilding("park", "bld-park-01", -3.1, -0.4, 0),
      makeBuilding("transit", "bld-transit-01", 1.5, 1.9, 0),
    ],
    policies: { waterSaver: false, publicTransit: true, greenIndustry: false },
    crisis: {
      active: true,
      stage: 1,
      pressure: 62,
      startedAt: 0,
      lastDecision: "لم يصدر قرار بعد",
    },
    relationships: [
      relationship("mayor", "ليلى منصور", "نائبة العمدة", 78, 82, "تنتظر قرارًا واضحًا يحمي الأحياء.", "#8eeaff"),
      relationship("water-adviser", "ياسين حمدي", "مستشار المياه", 64, 74, "يتذكر أنك أخّرت مشروع التحلية.", "#67d8e7"),
      relationship("industry-adviser", "نور شوقي", "مستشارة الصناعة", 70, 59, "تدعم التوسع بشرط حماية الوظائف.", "#f4b273"),
      relationship("community", "هالة فؤاد", "صوت السكان", 73, 66, "تراقب أثر القرارات على الأسر.", "#b6f18d"),
    ],
    log: [
      "بدأت المدينة على حافة الساحل في موسم جفاف مبكر.",
      "شبكة النقل العام جاهزة، لكن مخزون المياه يحتاج حماية.",
      "أولويتك: إيقاف سلسلة الجفاف قبل وصولها إلى الاحتجاجات.",
    ],
  };
}

function summarizeBuildings(state: CityState) {
  return state.buildings.reduce(
    (summary, building) => {
      const spec = BUILDING_SPECS[building.kind];
      const levelFactor = 0.85 + building.level * 0.15;
      summary.jobs += Math.round(spec.jobs * levelFactor);
      summary.residents += Math.round(spec.residents * levelFactor);
      summary.water += Math.round(spec.water * levelFactor);
      summary.energy += Math.round(spec.energy * levelFactor);
      summary.pollution += Math.round(spec.pollution * levelFactor);
      if (building.kind === "hospital") summary.hospitalCount += 1;
      if (building.kind === "park") summary.parkCount += 1;
      if (building.kind === "transit") summary.transitCount += 1;
      if (building.kind === "desalination") summary.desalinationCount += 1;
      return summary;
    },
    { jobs: 0, residents: 0, water: 0, energy: 0, pollution: 0, hospitalCount: 0, parkCount: 0, transitCount: 0, desalinationCount: 0 },
  );
}

function addLog(state: CityState, message: string): string[] {
  return [message, ...state.log].slice(0, 8);
}

function updateRelationships(state: CityState, updates: Record<string, Partial<Relationship>>): Relationship[] {
  return state.relationships.map((person) => ({ ...person, ...(updates[person.id] ?? {}) }));
}

export function advanceSimulation(previous: CityState): CityState {
  const state: CityState = structuredClone(previous);
  const summary = summarizeBuildings(state);
  const nextTick = state.tick + 1;
  const hour = (state.hour + 1) % 24;
  const day = hour === 0 ? state.day + 1 : state.day;
  const weatherTicks = state.weatherTicks + 1;
  const weatherRoll = nextRandom(state.seed + Math.floor(nextTick / 36));
  let weather = state.weather;
  if (weatherTicks >= 36) {
    weather = weatherRoll > 0.76 ? "storm" : weatherRoll < 0.27 ? "heat" : "clear";
  }

  const waterPolicy = state.policies.waterSaver ? 8 : 0;
  const transitPolicy = state.policies.publicTransit ? 7 : 0;
  const greenPolicy = state.policies.greenIndustry ? 8 : 0;
  const weatherWaterEffect = weather === "heat" ? -8 : weather === "storm" ? 5 : 0;
  const weatherEnergyEffect = weather === "storm" ? -7 : weather === "heat" ? 5 : 0;
  const waterDelta = Math.round(summary.water + 18 - state.population / 58 + waterPolicy + weatherWaterEffect);
  const energyDelta = Math.round(summary.energy + 27 - state.population / 48 + weatherEnergyEffect);
  const income = Math.max(0, Math.round(summary.jobs * 0.34));
  const upkeep = Math.round(state.buildings.length * 12 + summary.jobs * 0.04);
  const waterStress = waterDelta < -8 || state.water < 35 ? 4 : 0;
  const energyStress = energyDelta < -5 || state.energy < 30 ? 3 : 0;
  const pollutionDelta = Math.round(summary.pollution - greenPolicy - transitPolicy + (weather === "storm" ? -2 : 1));
  const satisfactionDelta = Math.round(
    (state.water > 48 ? 1 : -2) +
      (state.energy > 45 ? 1 : -1) +
      (state.health > 70 ? 1 : -1) +
      (state.pollution < 32 ? 1 : -2) -
      waterStress -
      energyStress +
      (state.policies.publicTransit ? 1 : 0),
  );
  const pressureDelta = state.crisis.active ? (state.water < 40 ? 3 : state.water < 55 ? 1 : -2) + (weather === "heat" ? 2 : 0) : -1;
  const pressure = clamp(state.crisis.pressure + pressureDelta, 0, 100);
  const stage: 1 | 2 | 3 = pressure >= 78 ? 3 : pressure >= 48 ? 2 : 1;

  const next: CityState = {
    ...state,
    tick: nextTick,
    day,
    hour,
    weather,
    weatherTicks: weatherTicks >= 36 ? 0 : weatherTicks,
    money: Math.max(0, Math.round(state.money + income - upkeep)),
    water: clamp(state.water + waterDelta, 0, 100),
    energy: clamp(state.energy + energyDelta, 0, 100),
    population: Math.max(0, state.population + Math.round((state.satisfaction - 68) / 24)),
    jobs: Math.max(0, summary.jobs),
    satisfaction: clamp(state.satisfaction + satisfactionDelta, 0, 100),
    pollution: clamp(state.pollution + pollutionDelta, 0, 100),
    health: clamp(state.health + Math.round((summary.hospitalCount * 0.7) - state.pollution / 48 - waterStress), 0, 100),
    traffic: clamp(state.traffic + Math.round(28 - summary.transitCount * 4 - transitPolicy + state.population / 180), 0, 100),
    crisis: { ...state.crisis, pressure, stage, active: pressure > 8 },
  };

  if (nextTick % 12 === 0) {
    const note = next.crisis.active
      ? `نبض ${next.day}: الضغط المائي الآن ${next.crisis.pressure}٪.`
      : "استقرت أزمة المياه مؤقتًا، لكن المدينة ما زالت تراقب السماء.";
    next.log = addLog(next, note);
  }
  return next;
}

export function applyDecision(previous: CityState, decision: DecisionId): { state: CityState; message: string; ok: boolean } {
  const state: CityState = structuredClone(previous);
  if (!state.crisis.active) return { state, message: "لا توجد أزمة مفتوحة الآن.", ok: false };

  if (decision === "importWater") {
    if (state.money < 1200) return { state, message: "الخزينة لا تكفي للاستيراد المؤقت.", ok: false };
    state.money -= 1200;
    state.water = clamp(state.water + 34, 0, 100);
    state.satisfaction = clamp(state.satisfaction + 2, 0, 100);
    state.crisis.pressure = clamp(state.crisis.pressure - 38, 0, 100);
    state.crisis.lastDecision = "استيراد مياه طارئ";
    state.crisis.active = state.crisis.pressure > 8;
    state.log = addLog(state, "وصلت شحنات المياه، واشترت المدينة وقتًا ثمينًا.");
    state.relationships = updateRelationships(state, { "water-adviser": { trust: clamp(state.relationships[1].trust + 5, 0, 100), memory: "يتذكر أنك تحركت بسرعة وقت الخطر." } });
    return { state, message: "تم احتواء الموجة الحالية باستيراد مؤقت.", ok: true };
  }

  if (decision === "rationWater") {
    state.water = clamp(state.water + 18, 0, 100);
    state.satisfaction = clamp(state.satisfaction - 7, 0, 100);
    state.health = clamp(state.health - 2, 0, 100);
    state.crisis.pressure = clamp(state.crisis.pressure - 24, 0, 100);
    state.crisis.lastDecision = "تقنين المياه";
    state.crisis.active = state.crisis.pressure > 8;
    state.log = addLog(state, "بدأ التقنين؛ المخزون تحسن لكن الأحياء بدأت تشكو.");
    state.relationships = updateRelationships(state, { community: { trust: clamp(state.relationships[3].trust - 8, 0, 100), memory: "لن تنسى أثر التقنين على الأسر." } });
    return { state, message: "تم خفض الاستهلاك، لكن الثقة الشعبية تراجعت.", ok: true };
  }

  if (state.money < BUILDING_SPECS.desalination.cost) return { state, message: "الخزينة لا تكفي لبناء محطة التحلية.", ok: false };
  if (state.buildings.some((building) => building.kind === "desalination")) return { state, message: "محطة التحلية موجودة بالفعل.", ok: false };
  state.money -= BUILDING_SPECS.desalination.cost;
  state.buildings.push(makeBuilding("desalination", "bld-desalination-01", -0.6, -5.6, state.tick));
  state.water = clamp(state.water + 25, 0, 100);
  state.crisis.pressure = clamp(state.crisis.pressure - 55, 0, 100);
  state.crisis.lastDecision = "بدء مشروع التحلية";
  state.crisis.active = state.crisis.pressure > 8;
  state.log = addLog(state, "بدأت أعمال محطة التحلية؛ حل بطيء لكنه يغير مستقبل المدينة.");
  state.relationships = updateRelationships(state, { "water-adviser": { trust: clamp(state.relationships[1].trust + 14, 0, 100), memory: "أثبتَّ أنك مستعد للاستثمار في حل دائم." }, mayor: { trust: clamp(state.relationships[0].trust + 7, 0, 100) } });
  return { state, message: "بدأ الحل الدائم، وستظهر فوائده مع استمرار التشغيل.", ok: true };
}

export function placeBuilding(previous: CityState, kind: BuildingKind, x: number, y: number): { state: CityState; message: string; ok: boolean } {
  const state: CityState = structuredClone(previous);
  const spec = BUILDING_SPECS[kind];
  if (state.money < spec.cost) return { state, message: "الخزينة لا تكفي لهذا المشروع.", ok: false };
  if (Math.abs(x) > WORLD_LIMIT - 1 || Math.abs(y) > WORLD_LIMIT - 1) return { state, message: "هذه المنطقة خارج حدود المخطط الحالي.", ok: false };
  const occupied = state.buildings.some((building) => Math.hypot(building.x - x, building.y - y) < 1.25);
  if (occupied) return { state, message: "الموقع مشغول؛ اختر بلاطة أخرى.", ok: false };
  const id = `bld-${kind}-${state.tick}-${state.buildings.length}`;
  state.money -= spec.cost;
  state.buildings.push(makeBuilding(kind, id, Math.round(x * 10) / 10, Math.round(y * 10) / 10, state.tick));
  state.log = addLog(state, `تم إنشاء ${spec.name}، وأضيف أثره إلى المحاكاة.`);
  return { state, message: `تم بناء ${spec.name} بنجاح.`, ok: true };
}

export function upgradeBuilding(previous: CityState, buildingId: string): { state: CityState; message: string; ok: boolean } {
  const state: CityState = structuredClone(previous);
  const building = state.buildings.find((item) => item.id === buildingId);
  if (!building) return { state, message: "لم يعد المبنى موجودًا.", ok: false };
  const cost = 450 + building.level * 300;
  if (state.money < cost) return { state, message: "الخزينة لا تكفي للترقية.", ok: false };
  state.money -= cost;
  building.level = Math.min(5, building.level + 1);
  building.condition = 100;
  state.log = addLog(state, `تمت ترقية ${BUILDING_SPECS[building.kind].name} إلى المستوى ${building.level}.`);
  return { state, message: "تمت الترقية وارتفعت كفاءة المبنى.", ok: true };
}

export function togglePolicy(previous: CityState, policy: PolicyId): CityState {
  const state: CityState = structuredClone(previous);
  state.policies[policy] = !state.policies[policy];
  const status = state.policies[policy] ? "فُعّلت" : "أُوقفت";
  state.log = addLog(state, `${status} سياسة ${policy === "waterSaver" ? "ترشيد المياه" : policy === "publicTransit" ? "النقل العام" : "الصناعة النظيفة"}.`);
  return state;
}

export function checksum(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function saveEnvelope(state: CityState) {
  const serialized = JSON.stringify(state);
  return { saveVersion: SAVE_VERSION, savedAt: Date.now(), checksum: checksum(serialized), state };
}

export function readSaveEnvelope(raw: string | null): CityState | null {
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as { saveVersion?: number; checksum?: string; state?: CityState };
    if (!envelope.state || envelope.saveVersion !== SAVE_VERSION) return null;
    if (envelope.checksum !== checksum(JSON.stringify(envelope.state))) return null;
    if (!Array.isArray(envelope.state.buildings) || typeof envelope.state.money !== "number") return null;
    return { ...createInitialCity(envelope.state.seed), ...envelope.state, saveVersion: SAVE_VERSION };
  } catch {
    return null;
  }
}
