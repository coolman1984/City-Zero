export type BuildingKind =
  | "solar"
  | "water"
  | "factory"
  | "homes"
  | "hospital"
  | "park"
  | "desalination"
  | "transit";

export type Weather = "clear" | "heat" | "storm";
export type PolicyId = "waterSaver" | "publicTransit" | "greenIndustry";
export type DecisionId = "importWater" | "rationWater" | "buildDesalination";

export interface Building {
  id: string;
  kind: BuildingKind;
  x: number;
  y: number;
  level: number;
  condition: number;
  builtAt: number;
}

export interface CrisisState {
  active: boolean;
  stage: 1 | 2 | 3;
  pressure: number;
  startedAt: number;
  lastDecision: string;
}

export interface Relationship {
  id: string;
  name: string;
  role: string;
  trust: number;
  influence: number;
  memory: string;
  color: string;
}

export interface CityState {
  saveVersion: number;
  seed: number;
  tick: number;
  day: number;
  hour: number;
  money: number;
  water: number;
  energy: number;
  population: number;
  jobs: number;
  satisfaction: number;
  pollution: number;
  health: number;
  traffic: number;
  weather: Weather;
  weatherTicks: number;
  speed: 0 | 1 | 2 | 4;
  paused: boolean;
  buildings: Building[];
  policies: Record<PolicyId, boolean>;
  crisis: CrisisState;
  relationships: Relationship[];
  log: string[];
}

export interface BuildingSpec {
  kind: BuildingKind;
  name: string;
  short: string;
  description: string;
  cost: number;
  color: string;
  accent: string;
  jobs: number;
  residents: number;
  water: number;
  energy: number;
  pollution: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const BUILDING_SPECS: Record<BuildingKind, BuildingSpec> = {
  solar: {
    kind: "solar",
    name: "حقل شمسي",
    short: "طاقة",
    description: "إنتاج نظيف يخفف الضغط عن الشبكة.",
    cost: 1800,
    color: "#d59b37",
    accent: "#ffe59b",
    jobs: 4,
    residents: 0,
    water: 0,
    energy: 28,
    pollution: -4,
  },
  water: {
    kind: "water",
    name: "خزان مياه",
    short: "مياه",
    description: "يرفع المخزون ويمنع انهيار الشبكة.",
    cost: 1500,
    color: "#168da2",
    accent: "#8eeaff",
    jobs: 3,
    residents: 0,
    water: 32,
    energy: -4,
    pollution: 0,
  },
  factory: {
    kind: "factory",
    name: "مصنع ذكي",
    short: "صناعة",
    description: "وظائف ودخل أعلى مع عبء بيئي يجب إدارته.",
    cost: 2400,
    color: "#8d536d",
    accent: "#f5afc5",
    jobs: 26,
    residents: 0,
    water: -8,
    energy: -16,
    pollution: 10,
  },
  homes: {
    kind: "homes",
    name: "مساكن",
    short: "سكن",
    description: "تستوعب سكانًا جددًا وتحتاج إلى خدمات مستقرة.",
    cost: 1200,
    color: "#57779a",
    accent: "#c3dcf5",
    jobs: 0,
    residents: 48,
    water: -5,
    energy: -6,
    pollution: 1,
  },
  hospital: {
    kind: "hospital",
    name: "مستشفى",
    short: "صحة",
    description: "يرفع الصحة ويجعل الأزمات أقل خطورة.",
    cost: 2200,
    color: "#3e9d91",
    accent: "#b6fff0",
    jobs: 12,
    residents: 0,
    water: -4,
    energy: -9,
    pollution: -2,
  },
  park: {
    kind: "park",
    name: "حديقة عامة",
    short: "بيئة",
    description: "تخفض التلوث وتزيد رضا السكان.",
    cost: 900,
    color: "#3d9b64",
    accent: "#9af5a7",
    jobs: 2,
    residents: 0,
    water: -2,
    energy: 0,
    pollution: -7,
  },
  desalination: {
    kind: "desalination",
    name: "محطة تحلية",
    short: "تحلية",
    description: "حل طويل الأجل لأزمة المدينة الصحراوية.",
    cost: 4200,
    color: "#256a9e",
    accent: "#a9e8ff",
    jobs: 9,
    residents: 0,
    water: 55,
    energy: -22,
    pollution: 2,
  },
  transit: {
    kind: "transit",
    name: "محطة نقل عام",
    short: "نقل",
    description: "تخفف الزحام وتوصل السكان بالوظائف.",
    cost: 1700,
    color: "#bd7341",
    accent: "#ffd19e",
    jobs: 8,
    residents: 0,
    water: 0,
    energy: -5,
    pollution: -5,
  },
};

export const POLICY_SPECS: Record<PolicyId, { name: string; description: string; icon: string }> = {
  waterSaver: {
    name: "حملة ترشيد المياه",
    description: "تقلل استهلاك المنازل، لكنها تحتاج تواصلًا مستمرًا.",
    icon: "💧",
  },
  publicTransit: {
    name: "أولوية النقل العام",
    description: "تخفف الزحام والتلوث وتزيد تكلفة التشغيل.",
    icon: "🚌",
  },
  greenIndustry: {
    name: "معيار الصناعة النظيفة",
    description: "يخفض تلوث المصانع مقابل تكلفة رقابية.",
    icon: "🌿",
  },
};
