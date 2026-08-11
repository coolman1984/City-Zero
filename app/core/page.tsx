"use client";

import {
  ArrowLeft,
  Buildings,
  Crosshair,
  CurrencyDollar,
  Drop,
  Factory,
  Info,
  Lightning,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  MoonStars,
  Sparkle,
  Sun,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Hotspot = {
  id: string;
  name: string;
  purpose: string;
  level: number;
  status: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: number;
};

type SceneBridge = {
  focusBuilding: (id: string) => void;
  focusHome: () => void;
  setNight: (value: boolean) => void;
  zoomBy: (factor: number) => void;
};

const HOTSPOTS: Hotspot[] = [
  {
    id: "power",
    name: "Thermal Power Complex",
    purpose: "Generates base-load power for the desert district.",
    level: 4,
    status: "Stable output",
    value: "850 MW",
    x: 445,
    y: 310,
    width: 300,
    height: 260,
    accent: 0x69e7ff,
  },
  {
    id: "water",
    name: "Strategic Water Tower",
    purpose: "Balances clean-water pressure across residential zones.",
    level: 3,
    status: "68% reserve",
    value: "620 ML",
    x: 682,
    y: 438,
    width: 170,
    height: 240,
    accent: 0x68d7ff,
  },
  {
    id: "factory",
    name: "Future Industries",
    purpose: "Creates skilled jobs, exports and controlled emissions.",
    level: 3,
    status: "High demand",
    value: "1,840 jobs",
    x: 460,
    y: 765,
    width: 300,
    height: 230,
    accent: 0xffbc70,
  },
  {
    id: "residential",
    name: "Oasis Residential Quarter",
    purpose: "A walkable community with local services and green streets.",
    level: 2,
    status: "82% happiness",
    value: "2,350 people",
    x: 360,
    y: 1125,
    width: 360,
    height: 290,
    accent: 0xbaf58f,
  },
  {
    id: "civic",
    name: "Civic Beacon",
    purpose: "Coordinates emergency response and public communication.",
    level: 2,
    status: "All systems ready",
    value: "District 07",
    x: 758,
    y: 1380,
    width: 210,
    height: 270,
    accent: 0xa9b9ff,
  },
];

const DEFAULT_HOTSPOT = HOTSPOTS[2];

function Resource({ icon, label, value, delta }: { icon: ReactNode; label: string; value: string; delta: string }) {
  return (
    <div className="core-resource">
      <span>{icon}</span>
      <div><small>{label}</small><b>{value}</b><em>{delta}</em></div>
    </div>
  );
}

export default function CorePreview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneBridge | null>(null);
  const nightRef = useRef(false);
  const [selected, setSelected] = useState<Hotspot>(DEFAULT_HOTSPOT);
  const [night, setNight] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    nightRef.current = night;
    sceneRef.current?.setNight(night);
  }, [night]);

  useEffect(() => {
    if (!hostRef.current) return;
    let disposed = false;
    let game: import("phaser").Game | undefined;

    void import("phaser").then((Phaser) => {
      if (disposed || !hostRef.current) return;

      const worldWidth = 941;
      const worldHeight = 1672;

      class CityShowcaseScene extends Phaser.Scene implements SceneBridge {
        private city!: import("phaser").GameObjects.Image;
        private nightOverlay!: import("phaser").GameObjects.Rectangle;
        private warmthOverlay!: import("phaser").GameObjects.Rectangle;
        private selectionGlow!: import("phaser").GameObjects.Ellipse;
        private hoverGlow!: import("phaser").GameObjects.Ellipse;
        private cityLights: import("phaser").GameObjects.Arc[] = [];
        private minZoom = 0.5;
        private maxZoom = 1.6;
        private nightTarget = 0;
        private warmthTarget = 0.06;
        private dragging = false;
        private dragMoved = false;
        private lastX = 0;
        private lastY = 0;
        private pinchDistance = 0;

        preload() {
          this.load.image("city-master", "/city-reference.png");
        }

        create() {
          this.cameras.main.setBackgroundColor(0x06131e);
          this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
          this.city = this.add.image(0, 0, "city-master").setOrigin(0).setDepth(0);

          this.createGeneratedTextures();
          this.createTraffic();
          this.createSmoke();
          this.createCityLights();
          this.createWaterHighlights();

          this.warmthOverlay = this.add.rectangle(0, 0, worldWidth, worldHeight, 0xffa349, 0.06)
            .setOrigin(0)
            .setDepth(70)
            .setBlendMode(Phaser.BlendModes.SOFT_LIGHT);
          this.nightOverlay = this.add.rectangle(0, 0, worldWidth, worldHeight, 0x071932, 0)
            .setOrigin(0)
            .setDepth(71)
            .setBlendMode(Phaser.BlendModes.MULTIPLY);

          this.hoverGlow = this.add.ellipse(0, 0, 120, 90, 0x7ff5ff, 0.04)
            .setStrokeStyle(3, 0xb8ffff, 0.76)
            .setDepth(90)
            .setVisible(false);
          this.selectionGlow = this.add.ellipse(0, 0, 120, 90, DEFAULT_HOTSPOT.accent, 0.07)
            .setStrokeStyle(4, DEFAULT_HOTSPOT.accent, 0.94)
            .setDepth(91);

          HOTSPOTS.forEach((hotspot) => this.createHotspot(hotspot));
          this.selectHotspot(DEFAULT_HOTSPOT);
          this.bindCameraControls();
          this.layoutCamera(true);
          this.setNight(nightRef.current);

          this.scale.on("resize", () => this.layoutCamera(false));
          sceneRef.current = this;
          setLoaded(true);
        }

        private createGeneratedTextures() {
          const smoke = this.make.graphics({ x: 0, y: 0, add: false });
          smoke.fillStyle(0xffffff, 0.05).fillCircle(32, 32, 30);
          smoke.fillStyle(0xffffff, 0.12).fillCircle(32, 32, 24);
          smoke.fillStyle(0xffffff, 0.22).fillCircle(32, 32, 17);
          smoke.fillStyle(0xffffff, 0.42).fillCircle(32, 32, 9);
          smoke.generateTexture("soft-smoke", 64, 64);
          smoke.destroy();

          const car = this.make.graphics({ x: 0, y: 0, add: false });
          car.fillStyle(0x121b24, 0.38).fillRoundedRect(1, 2, 17, 7, 3);
          car.fillStyle(0xffd46c, 1).fillRoundedRect(2, 0, 14, 6, 2);
          car.fillStyle(0xd7f7ff, 0.9).fillRect(9, 1, 4, 2);
          car.generateTexture("traffic-car", 20, 10);
          car.destroy();

          const glint = this.make.graphics({ x: 0, y: 0, add: false });
          glint.fillStyle(0xffffff, 0.08).fillCircle(12, 12, 11);
          glint.fillStyle(0xd9ffff, 0.45).fillCircle(12, 12, 4);
          glint.fillStyle(0xffffff, 0.95).fillCircle(12, 12, 1.5);
          glint.generateTexture("city-glint", 24, 24);
          glint.destroy();
        }

        private createSmoke() {
          const stacks = [
            { x: 337, y: 218, scale: 1.25 },
            { x: 435, y: 190, scale: 1.38 },
            { x: 524, y: 200, scale: 0.88 },
            { x: 520, y: 685, scale: 0.6 },
            { x: 574, y: 670, scale: 0.5 },
          ];

          stacks.forEach((stack, index) => {
            const emitter = this.add.particles(stack.x, stack.y, "soft-smoke", {
              lifespan: { min: 2500, max: 4700 },
              frequency: 320 + index * 55,
              quantity: 1,
              speedX: { min: 4, max: 15 },
              speedY: { min: -24, max: -12 },
              scale: { start: 0.16 * stack.scale, end: 0.95 * stack.scale },
              alpha: { start: 0.52, end: 0 },
              rotate: { min: -25, max: 25 },
              tint: [0xffffff, 0xe7eff0, 0xd8dfe1],
              blendMode: Phaser.BlendModes.SCREEN,
            });
            emitter.setDepth(18);
          });
        }

        private createTraffic() {
          const routes = [
            { from: [90, 507], to: [846, 866], duration: 15800, tint: 0xffd66e },
            { from: [884, 533], to: [140, 945], duration: 18100, tint: 0x9de8ff },
            { from: [120, 1000], to: [830, 1325], duration: 16600, tint: 0xff8b6f },
            { from: [795, 764], to: [240, 1080], duration: 14300, tint: 0xf7f7f0 },
            { from: [155, 394], to: [795, 685], duration: 17600, tint: 0x9cf49c },
          ];

          routes.forEach((route, routeIndex) => {
            const [fromX, fromY] = route.from;
            const [toX, toY] = route.to;
            const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
            for (let copy = 0; copy < 2; copy += 1) {
              const car = this.add.image(fromX, fromY, "traffic-car")
                .setScale(0.48)
                .setRotation(angle)
                .setTint(route.tint)
                .setDepth(8);
              this.tweens.add({
                targets: car,
                x: toX,
                y: toY,
                duration: route.duration,
                delay: copy * (route.duration * 0.48) + routeIndex * 900,
                repeat: -1,
                ease: "Linear",
              });
            }
          });
        }

        private createCityLights() {
          const lights = [
            [115, 488], [196, 521], [274, 557], [355, 594], [448, 637], [536, 681], [624, 722], [710, 765], [803, 809],
            [824, 541], [750, 584], [682, 623], [604, 667], [526, 710], [441, 758], [362, 804], [280, 850], [194, 900],
            [155, 1008], [243, 1047], [330, 1085], [421, 1127], [512, 1168], [607, 1212], [701, 1253], [792, 1295],
          ];

          lights.forEach(([x, y], index) => {
            const halo = this.add.circle(x, y, index % 3 === 0 ? 5 : 3.8, index % 4 === 0 ? 0x8feaff : 0xffd47d, 0)
              .setDepth(75)
              .setBlendMode(Phaser.BlendModes.ADD);
            this.cityLights.push(halo);
            this.tweens.add({ targets: halo, scale: 1.55, duration: 900 + index * 29, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          });
        }

        private createWaterHighlights() {
          const glints = [
            [68, 1015], [103, 1063], [82, 1126], [126, 1192], [71, 1270], [140, 1340], [102, 1420], [208, 1510],
          ];
          glints.forEach(([x, y], index) => {
            const glint = this.add.image(x, y, "city-glint")
              .setScale(0.4 + (index % 3) * 0.12)
              .setAlpha(0.28)
              .setDepth(10)
              .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
              targets: glint,
              alpha: 0.72,
              scaleX: glint.scaleX * 1.8,
              duration: 1100 + index * 120,
              delay: index * 90,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          });
        }

        private createHotspot(hotspot: Hotspot) {
          const target = this.add.ellipse(hotspot.x, hotspot.y, hotspot.width, hotspot.height, 0xffffff, 0.001)
            .setDepth(88)
            .setInteractive({ useHandCursor: true });

          target.on("pointerover", () => {
            this.hoverGlow.setPosition(hotspot.x, hotspot.y).setSize(hotspot.width, hotspot.height).setVisible(true);
          });
          target.on("pointerout", () => this.hoverGlow.setVisible(false));
          target.on("pointerup", () => {
            if (!this.dragMoved) this.selectHotspot(hotspot);
          });
        }

        private selectHotspot(hotspot: Hotspot) {
          this.selectionGlow
            .setPosition(hotspot.x, hotspot.y)
            .setSize(hotspot.width, hotspot.height)
            .setFillStyle(hotspot.accent, 0.07)
            .setStrokeStyle(4, hotspot.accent, 0.94)
            .setVisible(true);
          this.tweens.killTweensOf(this.selectionGlow);
          this.selectionGlow.setScale(0.96).setAlpha(0.72);
          this.tweens.add({
            targets: this.selectionGlow,
            scale: 1.04,
            alpha: 1,
            duration: 920,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
          setSelected(hotspot);
        }

        private bindCameraControls() {
          this.input.addPointer(2);
          this.input.on("pointerdown", (pointer: import("phaser").Input.Pointer) => {
            this.dragging = true;
            this.dragMoved = false;
            this.lastX = pointer.x;
            this.lastY = pointer.y;
          });
          this.input.on("pointerup", () => {
            this.dragging = false;
            this.pinchDistance = 0;
          });
          this.input.on("pointermove", (pointer: import("phaser").Input.Pointer) => {
            const pointers = this.input.manager.pointers.filter((item: import("phaser").Input.Pointer) => item.isDown);
            if (pointers.length >= 2) {
              const distance = Phaser.Math.Distance.Between(pointers[0].x, pointers[0].y, pointers[1].x, pointers[1].y);
              if (this.pinchDistance > 0) this.zoomBy(distance / this.pinchDistance);
              this.pinchDistance = distance;
              this.dragMoved = true;
              return;
            }
            this.pinchDistance = 0;
            if (!this.dragging || !pointer.isDown) return;
            const dx = pointer.x - this.lastX;
            const dy = pointer.y - this.lastY;
            if (Math.abs(dx) + Math.abs(dy) > 3) this.dragMoved = true;
            if (this.dragMoved) {
              this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
              this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
            }
            this.lastX = pointer.x;
            this.lastY = pointer.y;
          });
          this.input.on("wheel", (pointer: import("phaser").Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
            const before = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.zoomBy(dy > 0 ? 0.9 : 1.1);
            const after = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.cameras.main.scrollX += before.x - after.x;
            this.cameras.main.scrollY += before.y - after.y;
          });
        }

        private layoutCamera(reset: boolean) {
          const width = this.scale.width;
          const height = this.scale.height;
          this.minZoom = Math.max(width / worldWidth, height / worldHeight);
          this.maxZoom = this.minZoom * 2.35;
          if (reset) {
            this.cameras.main.setZoom(this.minZoom * 1.02);
            this.cameras.main.centerOn(worldWidth * 0.51, worldHeight * 0.52);
          } else {
            this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom, this.minZoom, this.maxZoom));
          }
        }

        setNight(value: boolean) {
          this.nightTarget = value ? 0.62 : 0;
          this.warmthTarget = value ? 0 : 0.06;
        }

        zoomBy(factor: number) {
          const next = Phaser.Math.Clamp(this.cameras.main.zoom * factor, this.minZoom, this.maxZoom);
          this.cameras.main.setZoom(next);
        }

        focusHome() {
          this.cameras.main.pan(worldWidth * 0.5, worldHeight * 0.52, 650, "Sine.easeInOut");
          this.cameras.main.zoomTo(this.minZoom * 1.02, 650, "Sine.easeInOut");
        }

        focusBuilding(id: string) {
          const hotspot = HOTSPOTS.find((item) => item.id === id);
          if (!hotspot) return;
          this.selectHotspot(hotspot);
          this.cameras.main.pan(hotspot.x, hotspot.y, 720, "Sine.easeInOut");
          this.cameras.main.zoomTo(Math.min(this.maxZoom, this.minZoom * 1.65), 720, "Sine.easeInOut");
        }

        update() {
          if (!this.nightOverlay || !this.warmthOverlay) return;
          this.nightOverlay.alpha = Phaser.Math.Linear(this.nightOverlay.alpha, this.nightTarget, 0.055);
          this.warmthOverlay.alpha = Phaser.Math.Linear(this.warmthOverlay.alpha, this.warmthTarget, 0.055);
          const lightTarget = this.nightTarget > 0 ? 0.86 : 0.02;
          this.cityLights.forEach((light) => {
            light.alpha = Phaser.Math.Linear(light.alpha, lightTarget, 0.05);
          });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: "100%",
        height: "100%",
        backgroundColor: "#06131e",
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        scene: CityShowcaseScene,
        render: {
          antialias: true,
          antialiasGL: true,
          pixelArt: false,
          roundPixels: false,
          powerPreference: "high-performance",
          transparent: false,
        },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        fps: { target: 60, forceSetTimeOut: false },
      });
    });

    return () => {
      disposed = true;
      sceneRef.current = null;
      game?.destroy(true);
    };
  }, []);

  const cycleBuilding = () => {
    const index = HOTSPOTS.findIndex((item) => item.id === selected.id);
    const next = HOTSPOTS[(index + 1) % HOTSPOTS.length];
    sceneRef.current?.focusBuilding(next.id);
  };

  return (
    <main className={`core-preview ${night ? "is-night" : "is-day"}`} dir="ltr">
      <div ref={hostRef} className="core-stage" aria-label="City Zero high-fidelity interactive city" />
      <div className={`core-loading ${loaded ? "is-hidden" : ""}`}><Sparkle weight="fill" /><span>Rendering City Zero</span></div>

      <header className="core-header">
        <div className="core-brand">
          <span className="core-brand-mark">07</span>
          <div><small>DESERT DISTRICT</small><h1>CITY ZERO</h1><p>Living city visual core</p></div>
        </div>
        <div className="core-resources">
          <Resource icon={<CurrencyDollar weight="fill" />} label="Treasury" value="125,430" delta="+3,250 / h" />
          <Resource icon={<Lightning weight="fill" />} label="Energy" value="850" delta="+120 / h" />
          <Resource icon={<Drop weight="fill" />} label="Water" value="620" delta="+80 / h" />
          <Resource icon={<UsersThree weight="fill" />} label="Population" value="12,450" delta="+220 / h" />
        </div>
      </header>

      <div className="core-visual-badge"><span /><b>HIGH FIDELITY</b><small>2× RENDER · 60 FPS TARGET</small></div>

      <nav className="core-camera" aria-label="Camera controls">
        <button onClick={() => setNight((value) => !value)} aria-label={night ? "Switch to day" : "Switch to night"}>{night ? <Sun weight="fill" /> : <MoonStars weight="fill" />}</button>
        <button onClick={() => sceneRef.current?.focusHome()} aria-label="Center city"><Crosshair weight="bold" /></button>
        <button onClick={() => sceneRef.current?.zoomBy(1.16)} aria-label="Zoom in"><MagnifyingGlassPlus weight="bold" /></button>
        <button onClick={() => sceneRef.current?.zoomBy(0.86)} aria-label="Zoom out"><MagnifyingGlassMinus weight="bold" /></button>
      </nav>

      <aside className="core-card">
        <div className="core-card-topline"><span>SELECTED ASSET</span><em>{selected.status}</em></div>
        <h2>{selected.name}</h2>
        <p>{selected.purpose}</p>
        <div className="core-building-stats">
          <span><small>LEVEL</small><b>{selected.level}</b></span>
          <span><small>OUTPUT</small><b>{selected.value}</b></span>
          <span><small>CONDITION</small><b>Excellent</b></span>
        </div>
        <div className="core-level"><span style={{ width: `${Math.min(100, selected.level * 22)}%` }} /></div>
        <button className="core-focus" onClick={() => sceneRef.current?.focusBuilding(selected.id)}><Crosshair weight="bold" /> Focus camera</button>
      </aside>

      <footer className="core-bottom-nav">
        <Link href="/" aria-label="Return to full prototype"><ArrowLeft weight="bold" /><span>Prototype</span></Link>
        <button onClick={() => sceneRef.current?.focusHome()}><Buildings weight="fill" /><span>City</span></button>
        <button className="is-primary" onClick={cycleBuilding}><Factory weight="fill" /><span>Next asset</span></button>
        <button onClick={() => setNight((value) => !value)}>{night ? <Sun weight="fill" /> : <MoonStars weight="fill" />}<span>{night ? "Day" : "Night"}</span></button>
        <button onClick={() => sceneRef.current?.focusBuilding(selected.id)}><Info weight="fill" /><span>Inspect</span></button>
      </footer>

      <div className="core-gesture-hint">Drag to explore <i /> Pinch or scroll to zoom</div>
    </main>
  );
}
