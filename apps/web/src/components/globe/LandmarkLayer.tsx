// ============================================================
// File: apps/web/src/components/globe/LandmarkLayer.tsx
// ARGUS — Pakistan Intelligence Landmark System
//
// DATA: OpenStreetMap Overpass API via /api/osm/layer
//   All data is real. No hardcoded coordinates.
//   Fetched once per category, cached in memory forever.
//   Worker caches in Redis for 24h.
//
// TIER SYSTEM:
//   T1 (amber, 8px) — Military bases, airports, nuclear sites
//      Visible at ALL altitudes up to 1800km
//      Loaded immediately on mount
//
//   T2 (cyan, 6px) — Cities, ports, major infrastructure
//      Visible below 500km altitude
//      Loaded 2 seconds after mount (non-blocking)
//
//   T3 (white, 4px) — Universities, hospitals, mosques, power
//      Visible below 80km altitude
//      Loaded only when camera descends below 120km
//      (lazy loading — prevents unnecessary API calls)
//
// RENDER:
//   Three separate PointPrimitiveCollections — one per tier.
//   LabelCollection for landmark names.
//   PolylineCollection for runway/border outlines (T1 only).
//
// CLICK:
//   ScreenSpaceEventHandler on viewer canvas.
//   Picked entity → selectionStore → right panel updates.
//   Camera flies to landmark at appropriate zoom.
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import { useCommandStore } from '../../stores/commandStore';

// ── Icons for Liquid Labels ────────────────────────────────────
const ICONS: Record<string, string> = {
  military: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L3 7v9c0 5 9 6 9 6s9-1 9-6V7l-9-5z"/><circle cx="12" cy="12" r="3"/></svg>`,
  airports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5S19 4 16.5 5.5L13 9 4.8 7.2c-.5-.1-1 .1-1.2.6l-.3.3c-.2.2-.2.5-.1.7l7.4 5.4-3.5 3.5-2.2-.4c-.5-.1-1 .1-1.2.6l-.3.3c-.2.2-.2.5-.1.7l3 1.5 1.5 3c.2.2.5.2.7.1l.3-.3c.5-.2.7-.7.6-1.2l-.4-2.2 3.5-3.5 5.4 7.4c.2.2.5.2.7.1l.3-.3c.5-.2.7-.7.6-1.2z"/></svg>`,
  cities: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h3v11H3zM9 21V6h3v15zm6 0V14h3v7z"/></svg>`,
  ports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V8M5 12H2a10 10 0 0 0 20 0h-3M19 12l-7 8-7-8M12 2v6"/></svg>`,
  mountains: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 20l4-9 4 9M4 20l4-9 4 9 4-9 4 9"/></svg>`,
  universities: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  hospitals: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49 0 2.87.47 4 1.26V8c0-1.11-.89-2-2-2h-8V2c0-1.11-.89-2-2-2H4C2.89 0 2 .89 2 2v19c0 1.11.89 2 2 2h8.26c-.79-1.13-1.26-2.51-1.26-4 0-3.87 3.13-7 7-7zm-5-3h4v2h-4v-2zm-9 0h4v2H5v-2zm0-4h4v2H5V7zm0 8h4v2H5v-2zm0 4h4v2H5v-2zM19 16v6m3-3h-6"/></svg>`,
  mosques: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c0 2-2 4-2 4s2 2 2 4M6 12v9M18 12v9M12 12c-3 0-6 2-6 6v3h12v-3c0-4-3-6-6-6zM12 6c0 2-2 2-2 2s2 0 2 2"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  railways: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 11h16M4 15h16M8 3v18M16 3v18"/></svg>`,
};

// ── Canvas Texture Cache ───────────────────────────────────────
const labelTextureCache = new Map<string, HTMLCanvasElement>();

function createLiquidLabelCanvas(text: string, category: string, color: string): HTMLCanvasElement {
  const cacheKey = `${text}-${category}-${color}`;
  if (labelTextureCache.has(cacheKey)) return labelTextureCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Setup font for measuring
  const fontSize = 14;
  ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
  const textMetrics = ctx.measureText(text);

  const h = 28;
  const padding = 12;
  const iconSize = 16;
  const iconGap = 8;
  const w = textMetrics.width + padding * 2 + iconSize + iconGap;

  canvas.width = w + 4; // margin for glow
  canvas.height = h + 4;

  ctx.translate(2, 2);

  // Background pill
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, h / 2);
  ctx.fillStyle = 'rgba(10, 20, 30, 0.85)';
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Icon
  const svgString = ICONS[category] || ICONS.military;
  const img = new Image();
  const blob = new Blob([svgString.replace('currentColor', color)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  img.src = url;
  img.onload = () => {
    ctx.drawImage(img, padding, (h - iconSize) / 2, iconSize, iconSize);
    URL.revokeObjectURL(url);
  };

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, padding + iconSize + iconGap, h / 2 + fontSize / 2 - 2);

  labelTextureCache.set(cacheKey, canvas);
  return canvas;
}

// ── API endpoint ───────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// ── Altitude thresholds (metres) ──────────────────────────────
const T1_MAX_ALT = Infinity;    // T1 always visible
const T2_MAX_ALT = 500_000;     // T2 below 500km
const T3_LOAD_AT = 120_000;     // Load T3 when below 120km
const T3_MAX_ALT = 80_000;      // T3 visible below 80km

// ── Landmark categories per tier ──────────────────────────────
const T1_CATEGORIES = ['military', 'airports'] as const;
const T2_CATEGORIES = ['cities', 'ports', 'mountains'] as const;
const T3_CATEGORIES = [
  'universities', 'hospitals', 'mosques',
  'power', 'railways',
] as const;

// ── Visual config per tier ────────────────────────────────────
const TIER_CONFIG = {
  1: {
    color: '#FFB800',  // amber — strategic
    pixelSize: 8,
    labelBelowAlt: 300_000,
  },
  2: {
    color: '#00C8FF',  // cyan — important
    pixelSize: 6,
    labelBelowAlt: 80_000,
  },
  3: {
    color: '#FFFFFF',  // white — detail
    pixelSize: 4,
    labelBelowAlt: 20_000,
  },
} as const;

// ── Category-specific colors (override tier color) ────────────
const CATEGORY_COLORS: Record<string, string> = {
  military: '#FFB800', // amber
  airports: '#00AAFF', // blue
  cities: '#FFFFFF', // white
  ports: '#00FFCC', // teal
  mountains: '#88AAFF', // sky blue
  universities: '#00FF88', // green
  hospitals: '#FF4444', // red
  mosques: '#FFD700', // gold
  power: '#FFFF00', // yellow
  railways: '#FF8800', // orange
};

// ── Landmark elevation by category ────────────────────────────
// Offset from terrain so points render above Google 3D Tiles
const CATEGORY_ALT: Record<string, number> = {
  military: 100,
  airports: 80,
  cities: 150,
  mountains: 0,    // mountains are already at elevation
  default: 50,
};

interface OSMFeature {
  id: string;
  name: string;
  nameUrdu: string | null;
  nameEn: string;
  lat: number;
  lon: number;
  category: string;
  tags: Record<string, string>;
}

interface Props {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ── In-memory feature cache ────────────────────────────────────
// Once a category is loaded, it stays in memory forever.
// No re-fetching on re-render or component remount.
const featureCache = new Map<string, OSMFeature[]>();

// ════════════════════════════════════════════════════════════
// LANDMARK LAYER
// ════════════════════════════════════════════════════════════

export function LandmarkLayer({ viewerRef }: Props) {
  // ── Collection refs ────────────────────────────────────────
  const t1PointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const t2PointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const t3PointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const t1BillboardsRef = useRef<Cesium.BillboardCollection | null>(null);
  const t2BillboardsRef = useRef<Cesium.BillboardCollection | null>(null);
  const t3BillboardsRef = useRef<Cesium.BillboardCollection | null>(null);

  // ── State tracking ─────────────────────────────────────────
  const t3LoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler>();
  const altListenRef = useRef<Cesium.Event.RemoveCallback>();

  // ── Store ──────────────────────────────────────────────────
  const isEnabled = useCommandStore(
    (s) => (s as any).layers?.landmarks ?? true
  );
  const globeReady = useCommandStore((s) => s.globeReady);
  const setSelectedEntity = useCommandStore(
    (s) => (s as any).setSelectedEntity
  );

  // ── Toggle all collections ─────────────────────────────────
  useEffect(() => {
    if (t1PointsRef.current) t1PointsRef.current.show = isEnabled;
    if (t2PointsRef.current) t2PointsRef.current.show = isEnabled;
    if (t3PointsRef.current) t3PointsRef.current.show = isEnabled;
    if (t1BillboardsRef.current) t1BillboardsRef.current.show = isEnabled;
    if (t2BillboardsRef.current) t2BillboardsRef.current.show = isEnabled;
    if (t3BillboardsRef.current) t3BillboardsRef.current.show = isEnabled;
  }, [isEnabled]);

  // ── Fetch + add category to collection ─────────────────────
  const loadCategory = useCallback(async (
    category: string,
    tier: 1 | 2 | 3,
    pointsColl: Cesium.PointPrimitiveCollection,
    billboardsColl: Cesium.BillboardCollection,
  ) => {
    if (!mountedRef.current) return;

    // Return cached data immediately
    if (featureCache.has(category)) {
      const cached = featureCache.get(category)!;
      addToCollections(
        cached, category, tier, pointsColl, billboardsColl
      );
      return;
    }

    try {
      const res = await fetch(
        `${API}/api/osm/layer?category=${category}`
      );

      if (!res.ok) {
        console.warn(
          `[LANDMARKS] ${category}: HTTP ${res.status}`
        );
        return;
      }

      const data = await res.json();
      const features: OSMFeature[] = data.features || [];

      if (!mountedRef.current) return;

      // Cache before rendering
      featureCache.set(category, features);

      addToCollections(
        features, category, tier, pointsColl, billboardsColl
      );

      console.log(
        `[LANDMARKS] ${category} (T${tier}):`,
        `${features.length} features loaded`
      );

    } catch (e) {
      console.error(`[LANDMARKS] ${category} failed:`, e);
    }
  }, []);

  // ── Add features to Cesium collections ─────────────────────
  const addToCollections = (
    features: OSMFeature[],
    category: string,
    tier: 1 | 2 | 3,
    pointsColl: Cesium.PointPrimitiveCollection,
    billboardsColl: Cesium.BillboardCollection,
  ) => {
    const config = TIER_CONFIG[tier];
    const colorHex = CATEGORY_COLORS[category] || config.color;
    const color = Cesium.Color.fromCssColorString(colorHex);
    const altOffset = CATEGORY_ALT[category] ?? CATEGORY_ALT.default;

    // translucencyByDistance — auto-fade based on camera altitude
    const translucency = new Cesium.NearFarScalar(
      100,
      1.0,
      tier === 1 ? T1_MAX_ALT :
        tier === 2 ? T2_MAX_ALT : T3_MAX_ALT,
      tier === 1 ? 1.0 : 0.0     // T1 never fades, T2/T3 do
    );

    // Label translucency — tighter range than points
    // Billboard translucency — tighter range than points
    const billboardTranslucency = new Cesium.NearFarScalar(
      100,
      1.0,
      config.labelBelowAlt,
      0.0
    );

    for (const f of features) {
      if (!isFinite(f.lat) || !isFinite(f.lon)) continue;
      if (f.lat === 0 && f.lon === 0) continue;
      if (!f.name?.trim()) continue;

      const position = Cesium.Cartesian3.fromDegrees(
        f.lon,
        f.lat,
        altOffset
      );

      // Point primitive
      pointsColl.add({
        position,
        color,
        pixelSize: config.pixelSize,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        translucencyByDistance: translucency,
        scaleByDistance: new Cesium.NearFarScalar(
          500, 2.0,
          tier === 1 ? 1800000 : 500000, 0.6
        ),
        disableDepthTestDistance: tier === 1
          ? Number.POSITIVE_INFINITY   // T1 always on top
          : 0,                          // T2/T3 depth-tested
        id: {
          type: 'landmark',
          data: {
            ...f,
            tier,
            typeName: category,
          },
        },
      });

      // Label — name above point
      // Liquid Label — custom billboard with canvas texture
      const displayName = f.nameEn || f.name;
      const canvas = createLiquidLabelCanvas(displayName, category, colorHex);

      billboardsColl.add({
        position,
        image: canvas,
        pixelOffset: new Cesium.Cartesian2(0, -(config.pixelSize + 16)),
        translucencyByDistance: billboardTranslucency,
        disableDepthTestDistance: tier === 1
          ? Number.POSITIVE_INFINITY
          : 500000,
        scaleByDistance: new Cesium.NearFarScalar(
          1000, 1.0,
          config.labelBelowAlt, 0.7
        ),
        id: {
          type: 'landmark-label',
          name: displayName,
        },
      });
    }
  };

  // ── Main effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!globeReady) return;
    mountedRef.current = true;

    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // ── Create collections (tier order = render order) ──────
    const t1p = new Cesium.PointPrimitiveCollection();
    const t2p = new Cesium.PointPrimitiveCollection();
    const t3p = new Cesium.PointPrimitiveCollection();
    const t1b = new Cesium.BillboardCollection();
    const t2b = new Cesium.BillboardCollection();
    const t3b = new Cesium.BillboardCollection();

    // T3 renders first (bottom), T1 on top (most important)
    viewer.scene.primitives.add(t3p);
    viewer.scene.primitives.add(t3b);
    viewer.scene.primitives.add(t2p);
    viewer.scene.primitives.add(t2b);
    viewer.scene.primitives.add(t1p);
    viewer.scene.primitives.add(t1b);

    t1PointsRef.current = t1p;
    t2PointsRef.current = t2p;
    t3PointsRef.current = t3p;
    t1BillboardsRef.current = t1b;
    t2BillboardsRef.current = t2b;
    t3BillboardsRef.current = t3b;

    // ── Load T1 immediately ──────────────────────────────────
    // T1 is small (200 items max) — loads in < 1 second
    for (const cat of T1_CATEGORIES) {
      loadCategory(cat, 1, t1p, t1b);
    }

    // ── Load T2 after 2 seconds ──────────────────────────────
    // Stagger to not compete with T1 and globe tile loading
    const t2Timer = setTimeout(() => {
      for (const cat of T2_CATEGORIES) {
        loadCategory(cat, 2, t2p, t2b);
      }
    }, 2000);

    // ── Load T3 lazily when camera descends ──────────────────
    // T3 has 3000+ items — only load when user zooms in.
    // Watch camera altitude from commandStore.
    // Use postRender to check altitude — fires every frame.
    altListenRef.current = viewer.scene.postRender.addEventListener(
      () => {
        if (t3LoadedRef.current) return;

        const h = viewer.camera.positionCartographic?.height;
        if (!h) return;

        if (h < T3_LOAD_AT) {
          t3LoadedRef.current = true;
          console.log(
            '[LANDMARKS] Camera below 120km — loading T3 landmarks'
          );
          for (const cat of T3_CATEGORIES) {
            loadCategory(cat, 3, t3p, t3b);
          }
        }
      }
    );

    // ── Click handler ────────────────────────────────────────
    handlerRef.current = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );

    handlerRef.current.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        try {
          const picked = viewer.scene.pick(e.position);

          if (
            Cesium.defined(picked) &&
            picked.id?.type === 'landmark'
          ) {
            const { data } = picked.id;

            setSelectedEntity?.({
              type: 'landmark',
              data,
            });

            // Fly to landmark at appropriate zoom
            const zoomAlt =
              data.tier === 1 ? 3000 :
                data.tier === 2 ? 1500 : 600;

            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                data.lon, data.lat, zoomAlt
              ),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0,
              },
              duration: 2.0,
              easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            });
          }
        } catch {
          // Ignore pick errors on tile boundaries
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      clearTimeout(t2Timer);

      if (altListenRef.current) altListenRef.current();
      if (handlerRef.current) handlerRef.current.destroy();

      const v = viewerRef.current;
      if (v && !v.isDestroyed()) {
        [t1p, t2p, t3p].forEach(c => v.scene.primitives.remove(c));
        [t1b, t2b, t3b].forEach(c => v.scene.primitives.remove(c));
      }

      t1PointsRef.current = null;
      t2PointsRef.current = null;
      t3PointsRef.current = null;
      t1BillboardsRef.current = null;
      t2BillboardsRef.current = null;
      t3BillboardsRef.current = null;
    };
  }, [globeReady, loadCategory]);

  return null;
}