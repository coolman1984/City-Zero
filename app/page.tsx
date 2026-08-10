"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  BUILDING_SPECS,
  POLICY_SPECS,
  type BuildingKind,
  type Camera,
  type CityState,
  type DecisionId,
  type PolicyId,
} from "./game/types";
import { applyDecision, advanceSimulation, checksum, createInitialCity, placeBuilding, readSaveEnvelope, saveEnvelope, togglePolicy, upgradeBuilding } from "./game/simulation";
import { pickBuilding, renderCity, screenToWorld, snapWorld } from "./game/renderer";

type PanelId = "overview" | "build" | "crisis" | "network" | "policies" | "settings";

const SAVE_KEYS = ["city-zero-save-current", "city-zero-save-backup-1", "city-zero-save-backup-2", "city-zero-save-backup-3"] as const;

const formatNumber = (value: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(value));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function Metric({ icon, label, value, detail, tone }: { icon: string; label: string; value: string; detail?: string; tone: string }) {
  return (
    <div className={`metric-card ${tone}`}>
      <span className="metric-icon" aria-hidden="true">{icon}</span>
      <span className="metric-copy"><small>{label}</small><strong>{value}</strong>{detail && <em>{detail}</em>}</span>
    </div>
  );
}

function ProgressBar({ value, tone = "teal" }: { value: number; tone?: string }) {
  return <span className={`progress-track ${tone}`}><span style={{ width: `${clamp(value, 0, 100)}%` }} /></span>;
}

function PanelButton({ icon, label, active, onClick, alert }: { icon: string; label: string; active?: boolean; onClick: () => void; alert?: boolean }) {
  return <button className={`panel-button ${active ? "active" : ""}`} onClick={onClick} aria-label={label}><span>{icon}</span><small>{label}</small>{alert && <i />}</button>;
}

export default function Home() {
  const [game, setGame] = useState<CityState>(() => createInitialCity());
  const [panel, setPanel] = useState<PanelId>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buildKind, setBuildKind] = useState<BuildingKind | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState("");
  const [quality, setQuality] = useState("عالية");
  const [sound, setSound] = useState(true);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef(game);
  const selectedRef = useRef(selectedId);
  const buildKindRef = useRef(buildKind);
  const previewRef = useRef<{ x: number; y: number; valid: boolean } | null>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 4, zoom: 1 });
  const pointerRef = useRef({ active: false, x: 0, y: 0, moved: false });
  const toastTimer = useRef<number | null>(null);

  const selectedBuilding = useMemo(() => game.buildings.find((building) => building.id === selectedId) ?? null, [game.buildings, selectedId]);
  const selectedSpec = selectedBuilding ? BUILDING_SPECS[selectedBuilding.kind] : null;
  const activeBuildSpec = buildKind ? BUILDING_SPECS[buildKind] : null;
  const buildPreview = useMemo(() => {
    if (!buildKind || !cursorWorld) return null;
    const point = snapWorld(cursorWorld);
    const valid = game.money >= BUILDING_SPECS[buildKind].cost && Math.abs(point.x) <= 7 && Math.abs(point.y) <= 7 && !game.buildings.some((building) => Math.hypot(building.x - point.x, building.y - point.y) < 1.25);
    return { x: point.x, y: point.y, valid };
  }, [buildKind, cursorWorld, game.money, game.buildings]);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  useEffect(() => { buildKindRef.current = buildKind; }, [buildKind]);
  useEffect(() => { previewRef.current = buildPreview; }, [buildPreview]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  const commit = useCallback((next: CityState, message?: string) => {
    gameRef.current = next;
    setGame(next);
    if (message) notify(message);
  }, [notify]);

  const persist = useCallback((state: CityState) => {
    try {
      const current = localStorage.getItem(SAVE_KEYS[0]);
      const backupOne = localStorage.getItem(SAVE_KEYS[1]);
      const backupTwo = localStorage.getItem(SAVE_KEYS[2]);
      if (current) localStorage.setItem(SAVE_KEYS[1], current);
      if (backupOne) localStorage.setItem(SAVE_KEYS[2], backupOne);
      if (backupTwo) localStorage.setItem(SAVE_KEYS[3], backupTwo);
      localStorage.setItem(SAVE_KEYS[0], JSON.stringify(saveEnvelope(state)));
      setLastSaved(Date.now());
      notify("تم حفظ المدينة مع نسخة احتياطية.");
    } catch {
      notify("تعذر الحفظ؛ مساحة التخزين قد تكون ممتلئة.");
    }
  }, [notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const loaded = SAVE_KEYS.map((key) => readSaveEnvelope(localStorage.getItem(key))).find((value) => value !== null);
        if (loaded) {
          gameRef.current = loaded;
          setGame(loaded);
          setLastSaved(Date.now());
        }
      } catch {
        // The first run can proceed with a fresh city when storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = gameRef.current;
      if (current.paused || current.speed === 0) return;
      let next = current;
      for (let index = 0; index < current.speed; index += 1) next = advanceSimulation(next);
      gameRef.current = next;
      setGame(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let width = 1;
    let height = 1;
    let frame = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const draw = () => {
      renderCity(context, width, height, gameRef.current, cameraRef.current, selectedRef.current, previewRef.current);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { active: true, x: point.x, y: point.y, moved: false };
    if (buildKindRef.current) {
      const world = screenToWorld(point.x, point.y, point.width, point.height, cameraRef.current);
      setCursorWorld(world);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    if (buildKindRef.current) {
      const world = screenToWorld(point.x, point.y, point.width, point.height, cameraRef.current);
      setCursorWorld(world);
    }
    if (!pointerRef.current.active) return;
    const dx = point.x - pointerRef.current.x;
    const dy = point.y - pointerRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) pointerRef.current.moved = true;
    if (pointerRef.current.moved) {
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      pointerRef.current.x = point.x;
      pointerRef.current.y = point.y;
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    const wasMoved = pointerRef.current.moved;
    pointerRef.current.active = false;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture may already be released */ }
    if (wasMoved) return;
    const world = screenToWorld(point.x, point.y, point.width, point.height, cameraRef.current);
    if (buildKindRef.current) {
      const snapped = snapWorld(world);
      const result = placeBuilding(gameRef.current, buildKindRef.current, snapped.x, snapped.y);
      if (result.ok) {
        commit(result.state, result.message);
        setBuildKind(null);
        setCursorWorld(null);
      } else notify(result.message);
      return;
    }
    const picked = pickBuilding(point.x, point.y, point.width, point.height, gameRef.current, cameraRef.current);
    setSelectedId(picked);
    if (picked) setPanel("overview");
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    cameraRef.current.zoom = clamp(cameraRef.current.zoom * (event.deltaY > 0 ? 0.91 : 1.1), 0.68, 1.65);
  };

  const startBuild = (kind: BuildingKind) => {
    setBuildKind(kind);
    setPanel("overview");
    setCursorWorld(null);
    notify(`اختر مكان ${BUILDING_SPECS[kind].name} على الخريطة.`);
  };

  const handleDecision = (decision: DecisionId) => {
    const result = applyDecision(gameRef.current, decision);
    if (result.ok) commit(result.state, result.message);
    else notify(result.message);
  };

  const handleUpgrade = () => {
    if (!selectedId) return;
    const result = upgradeBuilding(gameRef.current, selectedId);
    if (result.ok) commit(result.state, result.message);
    else notify(result.message);
  };

  const handlePolicy = (policy: PolicyId) => commit(togglePolicy(gameRef.current, policy));

  const setSpeed = (speed: 0 | 1 | 2 | 4) => {
    const next = { ...gameRef.current, speed, paused: speed === 0 };
    commit(next, speed === 0 ? "توقفت المحاكاة." : `سرعة المحاكاة ×${speed}.`);
  };

  const togglePause = () => {
    const nextPaused = !gameRef.current.paused;
    commit({ ...gameRef.current, paused: nextPaused, speed: nextPaused ? 0 : 1 }, nextPaused ? "توقفت المدينة مؤقتًا." : "استؤنفت المحاكاة.");
  };

  const resetCamera = () => { cameraRef.current = { x: 0, y: 4, zoom: 1 }; notify("عادت الكاميرا إلى مركز المدينة."); };

  const weatherName = game.weather === "clear" ? "سماء صافية" : game.weather === "heat" ? "موجة حر" : "عاصفة رملية";
  const timeName = game.hour < 6 || game.hour >= 19 ? "ليل" : game.hour < 9 ? "فجر" : game.hour < 17 ? "نهار" : "غروب";
  const populationCapacity = Math.max(1, game.buildings.filter((building) => building.kind === "homes").reduce((total, building) => total + BUILDING_SPECS.homes.residents * building.level, 0) + 312);
  const selectedUpgradeCost = selectedBuilding ? 450 + selectedBuilding.level * 300 : 0;

  const panelContent = panel === "build" ? (
    <section className="panel-section">
      <div className="section-heading"><span><b>مصنع المدينة</b><small>كل مبنى يغير الحسابات فورًا</small></span><em>{game.buildings.length} مبنى</em></div>
      <div className="building-grid">
        {(Object.keys(BUILDING_SPECS) as BuildingKind[]).map((kind) => {
          const spec = BUILDING_SPECS[kind];
          const affordable = game.money >= spec.cost;
          return <button key={kind} className={`building-card ${affordable ? "" : "disabled"}`} onClick={() => affordable && startBuild(kind)} aria-label={`بناء ${spec.name}`}>
            <span className="building-art" style={{ "--building-color": spec.color, "--building-accent": spec.accent } as CSSProperties}><i>{kind === "solar" ? "☀" : kind === "water" || kind === "desalination" ? "≈" : kind === "factory" ? "⌂" : kind === "hospital" ? "+" : kind === "park" ? "✦" : "⇄"}</i></span>
            <span className="building-card-copy"><b>{spec.name}</b><small>{spec.description}</small><em>💰 {formatNumber(spec.cost)}</em></span>
          </button>;
        })}
      </div>
      <div className="mini-note">💡 اسحب الخريطة، ثم اضغط على بلاطة فارغة لوضع المبنى. عجلة الفأرة للتكبير.</div>
    </section>
  ) : panel === "crisis" ? (
    <section className="panel-section crisis-panel">
      <div className="section-heading"><span><b>غرفة الأزمات</b><small>كل قرار يغير علاقاتك ومواردك</small></span><span className={`status-dot ${game.crisis.active ? "danger" : "safe"}`}>{game.crisis.active ? "مفتوحة" : "محتواة"}</span></div>
      <div className="causal-chain"><span>الجفاف</span><i>↓</i><span>المياه</span><i>↓</i><span>ضغط الشبكة</span><i>↓</i><span>رضا السكان</span></div>
      <div className="crisis-pressure"><div><span>ضغط الأزمة</span><b>{formatNumber(game.crisis.pressure)}٪</b></div><ProgressBar value={game.crisis.pressure} tone="danger" /><small>المرحلة {game.crisis.stage} من 3 · آخر قرار: {game.crisis.lastDecision}</small></div>
      <div className="decision-list">
        <button onClick={() => handleDecision("importWater")}><span>🚚</span><b>استيراد مياه مؤقت</b><small>يخفض الضغط بسرعة · تكلفة ١٬٢٠٠</small><em>قرار سريع</em></button>
        <button onClick={() => handleDecision("rationWater")}><span>📉</span><b>تقنين المياه</b><small>يحسن المخزون ويخفض الثقة الشعبية</small><em>حل مؤلم</em></button>
        <button onClick={() => handleDecision("buildDesalination")}><span>🌊</span><b>بدء محطة تحلية</b><small>حل دائم · تكلفة ٤٬٢٠٠</small><em>استثمار طويل</em></button>
      </div>
    </section>
  ) : panel === "network" ? (
    <section className="panel-section">
      <div className="section-heading"><span><b>شبكة المدينة</b><small>الأنظمة والأشخاص يتذكرون قراراتك</small></span><em>حالة حية</em></div>
      <div className="network-map"><div className="network-orbit orbit-one" /><div className="network-orbit orbit-two" /><div className="network-core">🏙️<small>المدينة</small></div>{game.relationships.slice(0, 4).map((person, index) => <span key={person.id} className={`network-node node-${index}`} style={{ "--node-color": person.color } as CSSProperties}>{person.name.slice(0, 1)}</span>)}</div>
      <div className="relationship-list">{game.relationships.map((person) => <article className="relationship-card" key={person.id}><span className="avatar" style={{ background: person.color }}>{person.name.slice(0, 1)}</span><div><b>{person.name}</b><small>{person.role}</small><p>{person.memory}</p><div className="relationship-bars"><label>الثقة <ProgressBar value={person.trust} tone="green" /></label><label>التأثير <ProgressBar value={person.influence} tone="violet" /></label></div></div></article>)}</div>
    </section>
  ) : panel === "policies" ? (
    <section className="panel-section">
      <div className="section-heading"><span><b>مكتب السياسات</b><small>السياسة تعدل المحرك كل نبضة</small></span><em>قابلة للتغيير</em></div>
      <div className="policy-list">{(Object.keys(POLICY_SPECS) as PolicyId[]).map((policy) => { const spec = POLICY_SPECS[policy]; const active = game.policies[policy]; return <button key={policy} className={`policy-card ${active ? "enabled" : ""}`} onClick={() => handlePolicy(policy)}><span>{spec.icon}</span><div><b>{spec.name}</b><small>{spec.description}</small></div><i className="toggle"><u /></i></button>; })}</div>
      <div className="mini-note">كل سياسة لها فائدة وتكلفة. راقب النتيجة من مؤشرات المدينة، وليس من وصفها فقط.</div>
    </section>
  ) : panel === "settings" ? (
    <section className="panel-section">
      <div className="section-heading"><span><b>إعدادات التجربة</b><small>مصممة للهاتف والكمبيوتر</small></span><em>إصدار {game.saveVersion}</em></div>
      <div className="settings-list">
        <button className="setting-control" onClick={() => setSound((value) => !value)}><span>🔊 المؤثرات التجريبية</span><strong>{sound ? "مفعّلة" : "مغلقة"}</strong></button>
        <div className="setting-control quality-control"><span>🎨 جودة الرسم</span><div>{["اقتصادية", "متوسطة", "عالية"].map((item) => <button key={item} className={quality === item ? "selected" : ""} onClick={() => setQuality(item)}>{item}</button>)}</div></div>
        <button className="setting-control" onClick={resetCamera}><span>🧭 إعادة الكاميرا</span><strong>مركز المدينة</strong></button>
        <button className="save-action" onClick={() => persist(gameRef.current)}>💾 حفظ المدينة الآن</button>
        <button className="load-action" onClick={() => { const loaded = SAVE_KEYS.map((key) => readSaveEnvelope(localStorage.getItem(key))).find((value) => value !== null); if (loaded) { commit(loaded, "تم استرجاع آخر نسخة سليمة."); } else notify("لا توجد نسخة سليمة للاسترجاع."); }}>↩️ استرجاع نسخة سليمة</button>
      </div>
      {lastSaved && <div className="last-saved">آخر حفظ محلي: {new Date(lastSaved).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} · ثلاث نسخ احتياطية محمية</div>}
    </section>
  ) : (
    <section className="panel-section overview-panel">
      <div className="section-heading"><span><b>لوحة العمدة</b><small>منطقة الساحل · اليوم {formatNumber(game.day)}</small></span><span className={`weather-label ${game.weather}`}>{game.weather === "clear" ? "☀️" : game.weather === "heat" ? "♨️" : "🌪️"} {weatherName}</span></div>
      {selectedBuilding && selectedSpec ? <div className="selected-building"><div className="selected-title"><span className="selected-icon" style={{ background: selectedSpec.color }}>{selectedSpec.short}</span><span><b>{selectedSpec.name}</b><small>المستوى {selectedBuilding.level} · حالة {formatNumber(selectedBuilding.condition)}٪</small></span><button onClick={() => setSelectedId(null)} aria-label="إغلاق بطاقة المبنى">×</button></div><ProgressBar value={selectedBuilding.condition} tone="green" /><p>{selectedSpec.description}</p><div className="selected-effects"><span>💧 {selectedSpec.water > 0 ? "+" : ""}{selectedSpec.water}</span><span>⚡ {selectedSpec.energy > 0 ? "+" : ""}{selectedSpec.energy}</span><span>👥 {selectedSpec.jobs + selectedSpec.residents}</span></div><button className="upgrade-button" onClick={handleUpgrade}>ترقية المبنى · 💰 {formatNumber(selectedUpgradeCost)}</button></div> : <div className="mayor-brief"><span className="brief-icon">◈</span><div><b>قرارك التالي يصنع السلسلة التالية</b><p>المياه تحت المراقبة. افتح غرفة الأزمات، أو ابنِ مشروعًا، ثم راقب كيف يعيد المحرك حساب المدينة.</p></div></div>}
      <div className="insight-card"><span>✦</span><div><b>{game.crisis.active ? "إنذار مبكر" : "نافذة استقرار"}</b><p>{game.crisis.active ? "ضغط المياه قد يتحول إلى احتجاج إذا تجاهلته عدة نبضات." : "الأزمة محتواة مؤقتًا؛ استثمر في حل يمنع عودتها."}</p></div><button onClick={() => setPanel("crisis")}>فتح</button></div>
      <div className="log-block"><div className="log-title"><span>سجل المدينة</span><small>آخر الأحداث</small></div>{game.log.slice(0, 4).map((entry, index) => <p key={`${entry}-${index}`}><i>{String(index + 1).padStart(2, "0")}</i>{entry}</p>)}</div>
    </section>
  );

  return (
    <main className={`city-app quality-${quality === "اقتصادية" ? "eco" : quality === "متوسطة" ? "medium" : "high"}`} dir="rtl">
      <canvas ref={canvasRef} className="city-canvas" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onWheel={handleWheel} aria-label="خريطة مدينة الصفر التفاعلية" />
      <div className="canvas-glow" aria-hidden="true" />

      <header className="top-hud">
        <div className="brand-lockup"><span className="brand-symbol">ص٠</span><span><b>مدينة الصفر</b><small>نواة المحاكاة الحية</small></span></div>
        <div className="world-status"><span className="live-dot" /> <b>المدينة تعمل</b><small>البذرة {game.seed}</small></div>
        <div className="resource-strip">
          <Metric icon="💰" label="الخزينة" value={formatNumber(game.money)} detail="وحدة" tone="money" />
          <Metric icon="💧" label="المياه" value={`${formatNumber(game.water)}٪`} detail={game.water < 35 ? "خطر" : "مستقرة"} tone={game.water < 35 ? "danger" : "water"} />
          <Metric icon="⚡" label="الطاقة" value={`${formatNumber(game.energy)}٪`} detail={game.energy < 35 ? "مضغوطة" : "متوازنة"} tone="energy" />
          <Metric icon="🙂" label="الرضا" value={`${formatNumber(game.satisfaction)}٪`} detail={`${formatNumber(game.population)} نسمة`} tone="people" />
        </div>
      </header>

      <div className="map-label"><span>منطقة الساحل</span><b>خط العرض ٢٤°</b></div>
      <div className="camera-tools"><button onClick={() => { cameraRef.current.zoom = clamp(cameraRef.current.zoom + 0.12, 0.68, 1.65); }} aria-label="تكبير">＋</button><button onClick={() => { cameraRef.current.zoom = clamp(cameraRef.current.zoom - 0.12, 0.68, 1.65); }} aria-label="تصغير">−</button><button onClick={resetCamera} aria-label="مركز الخريطة">⌖</button></div>

      <aside className={`command-dock ${panel === "overview" ? "overview" : ""}`}>
        <nav className="dock-tabs" aria-label="أقسام المدينة">
          <PanelButton icon="◈" label="نظرة" active={panel === "overview"} onClick={() => setPanel("overview")} />
          <PanelButton icon="▦" label="بناء" active={panel === "build"} onClick={() => setPanel("build")} />
          <PanelButton icon="⚠" label="أزمات" active={panel === "crisis"} onClick={() => setPanel("crisis")} alert={game.crisis.active} />
          <PanelButton icon="⌘" label="شبكة" active={panel === "network"} onClick={() => setPanel("network")} />
          <PanelButton icon="☷" label="سياسات" active={panel === "policies"} onClick={() => setPanel("policies")} />
          <PanelButton icon="⚙" label="إعدادات" active={panel === "settings"} onClick={() => setPanel("settings")} />
        </nav>
        <div className="dock-content">{panelContent}</div>
      </aside>

      <section className="bottom-bar">
        <div className="time-block"><span className="time-orb">{timeName === "ليل" ? "☾" : timeName === "غروب" ? "◐" : "☀"}</span><span><b>اليوم {formatNumber(game.day)} · {String(game.hour).padStart(2, "0")}:00</b><small>{weatherName} · النبضة {formatNumber(game.tick)}</small></span></div>
        <div className="speed-controls"><button className={game.paused ? "active" : ""} onClick={togglePause}>{game.paused ? "▶" : "Ⅱ"}</button>{([1, 2, 4] as const).map((speed) => <button key={speed} className={!game.paused && game.speed === speed ? "active" : ""} onClick={() => setSpeed(speed)}>×{speed}</button>)}</div>
        <div className="city-health"><span><small>الصحة</small><b>{formatNumber(game.health)}٪</b></span><ProgressBar value={game.health} tone="green" /><span><small>التلوث</small><b>{formatNumber(game.pollution)}٪</b></span><ProgressBar value={game.pollution} tone="danger" /></div>
      </section>

      {buildKind && <div className="build-mode-banner"><span>🏗️ وضع البناء: {activeBuildSpec?.name}</span><small>اضغط على موقع صالح داخل الخريطة</small><button onClick={() => { setBuildKind(null); setCursorWorld(null); }}>إلغاء</button></div>}
      {toast && <div className="toast" role="status"><span>✦</span>{toast}</div>}
      <button className="help-button" onClick={() => setShowHelp(true)} aria-label="شرح طريقة اللعب">؟</button>

      {showHelp && <div className="help-layer" role="dialog" aria-modal="true" aria-label="طريقة اللعب"><section className="help-card"><button className="close-dialog" onClick={() => setShowHelp(false)} aria-label="إغلاق">×</button><span className="help-mark">ص٠</span><h2>ابدأ من نبضة واحدة</h2><p>هذه ليست صورة ثابتة. الخريطة تُرسم بالكود، وكل مبنى وسياسة وقرار يغير أرقام المدينة في الزمن الحقيقي.</p><div className="help-steps"><span><b>١</b><small>افتح الأزمات</small></span><span><b>٢</b><small>اختر قرارًا</small></span><span><b>٣</b><small>ابنِ وراقب الأثر</small></span></div><p className="help-note">على الكمبيوتر اسحب الخريطة واستخدم عجلة الفأرة. على الهاتف اسحب بإصبعك واضغط المباني للتفاصيل.</p><button className="primary-action" onClick={() => setShowHelp(false)}>فهمت، ابدأ اللعب</button></section></div>}

      <div className="engine-badge"><span className="engine-pulse" /> محرك حي · حفظ محلي · بذرة قابلة للإعادة · {checksum(JSON.stringify(game)).slice(0, 4)}</div>
      <div className="capacity-note">السكان {formatNumber(game.population)} / سعة السكن {formatNumber(populationCapacity)}</div>
    </main>
  );
}
