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
const API = import.meta.env.VITE_API_URL ?? '';

// ── Altitude thresholds (metres) ──────────────────────────────
const T3_LOAD_AT = 500_000;     // Load T3 when below 500km

// ── Landmark categories per tier ──────────────────────────────
const T1_CATEGORIES = ['military', 'airports'] as const;
const T2_CATEGORIES = ['cities', 'ports', 'mountains'] as const;
const T3_CATEGORIES = [
  'universities', 'hospitals', 'mosques',
  'power', 'railways',
] as const;

// ── Map OSM category → DataLayersMenu layer key ──────────────
// This connects each landmark category to its toggle in the UI
const CATEGORY_TO_LAYER: Record<string, string> = {
  military: 'military',
  airports: 'transport',
  cities: 'landmarks',      // no dedicated toggle, use master
  ports: 'landmarks',        // no dedicated toggle, use master
  mountains: 'landmarks',    // no dedicated toggle, use master
  universities: 'education',
  hospitals: 'healthcare',
  mosques: 'religious',
  power: 'industrial',
  railways: 'transport',
};


// ── Visual config per tier ────────────────────────────────────
const TIER_CONFIG = {
  1: {
    color: '#FFB800',  // amber — strategic
    pixelSize: 14,
    labelBelowAlt: 1_000_000,
  },
  2: {
    color: '#00C8FF',  // cyan — important
    pixelSize: 11,
    labelBelowAlt: 500_000,
  },
  3: {
    color: '#FFFFFF',  // white — detail
    pixelSize: 8,
    labelBelowAlt: 50_000,
  },
} as const;

// ── Category-specific colors (override tier color) ────────────
const CATEGORY_COLORS: Record<string, string> = {
  military: '#FFCC00', // brighter amber
  airports: '#00CCFF', // brighter blue
  cities: '#FFFFFF', // white
  ports: '#00FFE0', // brighter teal
  mountains: '#AACCFF', // brighter sky
  universities: '#00FF99', // brighter green
  hospitals: '#FF3355', // brighter red
  mosques: '#FFE030', // brighter gold
  power: '#FFFF44', // brighter yellow
  railways: '#FF9922', // brighter orange
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
  // ── Per-category collection refs ────────────────────────────
  // Each OSM category gets its own PointPrimitiveCollection + BillboardCollection
  // so individual DataLayersMenu toggles can show/hide them independently
  const categoryCollsRef = useRef<Map<string, {
    points: Cesium.PointPrimitiveCollection;
    billboards: Cesium.BillboardCollection;
  }>>(new Map());

  // ── State tracking ─────────────────────────────────────────
  const t3LoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler>();
  const altListenRef = useRef<Cesium.Event.RemoveCallback>();

  // ── Store ──────────────────────────────────────────────────
  const layers = useCommandStore((s) => (s as any).layers);
  const globeReady = useCommandStore((s) => s.globeReady);
  const setSelectedEntity = useCommandStore(
    (s) => (s as any).setSelectedEntity
  );

  // ── Toggle per-category collections based on layer toggles ──
  useEffect(() => {
    const masterEnabled = layers?.landmarks ?? true;
    const colls = categoryCollsRef.current;

    for (const [cat, { points, billboards }] of colls) {
      const layerKey = CATEGORY_TO_LAYER[cat] || 'landmarks';
      // Category is visible if: master toggle ON + its specific layer toggle ON
      const catEnabled = masterEnabled && (layers?.[layerKey] ?? true);
      points.show = catEnabled;
      billboards.show = catEnabled;
    }
  }, [layers]);

  // ── Fetch + add category to its own collection ──────────────
  const loadCategory = useCallback(async (
    category: string,
    tier: 1 | 2 | 3,
  ) => {
    if (!mountedRef.current) return;

    const entry = categoryCollsRef.current.get(category);
    if (!entry) return;
    const { points: pointsColl, billboards: billboardsColl } = entry;

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

      // Update landmark count in store
      const store = useCommandStore.getState() as any;
      const currentCount = store.layerCounts?.landmarks || 0;
      store.setLayerCount?.('landmarks', currentCount + features.length);

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
      tier === 1 ? 20000000 :
        tier === 2 ? 10000000 : 2000000,
      tier === 1 ? 0.4 : 0.0     // T1 never fully fades, T2/T3 do
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
        outlineWidth: 2,
        translucencyByDistance: translucency,
        scaleByDistance: tier === 1
          ? new Cesium.NearFarScalar(500, 3.0, 20000000, 0.5)
          : tier === 2
            ? new Cesium.NearFarScalar(500, 2.5, 15000000, 0.3)
            : new Cesium.NearFarScalar(500, 2.0, 5000000, 0.2),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
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
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
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

    // ── Create per-category collections ──────────────────────
    // Order: T3 first (bottom), then T2, then T1 (top)
    const orderedCats = [...T3_CATEGORIES, ...T2_CATEGORIES, ...T1_CATEGORIES];

    for (const cat of orderedCats) {
      const points = new Cesium.PointPrimitiveCollection();
      const billboards = new Cesium.BillboardCollection();
      viewer.scene.primitives.add(points);
      viewer.scene.primitives.add(billboards);

      // Apply initial visibility from store
      const layerKey = CATEGORY_TO_LAYER[cat] || 'landmarks';
      const store = useCommandStore.getState() as any;
      const masterOn = store.layers?.landmarks ?? true;
      const catOn = store.layers?.[layerKey] ?? true;
      points.show = masterOn && catOn;
      billboards.show = masterOn && catOn;

      categoryCollsRef.current.set(cat, { points, billboards });
    }

    // ── Load T1 immediately ──────────────────────────────────
    for (const cat of T1_CATEGORIES) {
      loadCategory(cat, 1);
    }

    // ── Load T2 after 2 seconds ──────────────────────────────
    const t2Timer = setTimeout(() => {
      for (const cat of T2_CATEGORIES) {
        loadCategory(cat, 2);
      }
    }, 2000);

    // ── Load T3 lazily when camera descends ──────────────────
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
            loadCategory(cat, 3);
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

            // Map OSMFeature → LandmarkEntity shape
            // OSMFeature has `lon`, store expects `lng`
            // OSMFeature lacks `city`/`province`, derive from tags
            setSelectedEntity?.({
              type: 'landmark',
              data: {
                name: data.nameEn || data.name,
                category: data.typeName || data.category,
                city: data.tags?.['addr:city'] || data.tags?.['is_in'] || 'Pakistan',
                province: data.tags?.['is_in:state'] || data.tags?.['addr:state'] || '',
                tier: `T${data.tier}`,
                lat: data.lat,
                lng: data.lon,  // lon → lng
              },
            });

            // Cancel any in-flight animation to prevent crash
            viewer.camera.cancelFlight();

            const altOffset = CATEGORY_ALT[data.typeName || data.category] ?? CATEGORY_ALT.default;
            const colorHex = CATEGORY_COLORS[data.typeName || data.category] || TIER_CONFIG[data.tier as 1|2|3]?.color || '#00C8FF';

            // Centered fly-to — straight down so landmark is centered
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                data.lon, data.lat, 1500
              ),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90),
                roll: 0,
              },
              duration: 2.2,
              easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
              complete: () => {
                if (viewer.isDestroyed()) return;
                viewer.camera.lookAt(
                  Cesium.Cartesian3.fromDegrees(data.lon, data.lat, altOffset),
                  new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), 1500)
                );
                viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
              },
            });

            // Glowing/blinking radius effect
            const glowId = `landmark-glow-${Date.now()}`;
            const startTime = Date.now();
            viewer.entities.add({
              id: glowId,
              position: Cesium.Cartesian3.fromDegrees(data.lon, data.lat, altOffset),
              ellipse: {
                semiMajorAxis: 350,
                semiMinorAxis: 350,
                height: altOffset + 1,
                material: new Cesium.ColorMaterialProperty(
                  new Cesium.CallbackProperty(() => {
                    const t = (Date.now() - startTime) / 1000;
                    const alpha = 0.12 + 0.12 * Math.sin(t * 3);
                    return Cesium.Color.fromCssColorString(colorHex).withAlpha(alpha);
                  }, false)
                ),
                outline: true,
                outlineColor: new Cesium.CallbackProperty(() => {
                  const t = (Date.now() - startTime) / 1000;
                  const alpha = 0.4 + 0.3 * Math.sin(t * 3);
                  return Cesium.Color.fromCssColorString(colorHex).withAlpha(alpha);
                }, false) as any,
                outlineWidth: 2,
              },
            });

            // Auto-remove glow after 10s
            setTimeout(() => {
              if (!viewer.isDestroyed()) viewer.entities.removeById(glowId);
            }, 10000);
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
        for (const { points, billboards } of categoryCollsRef.current.values()) {
          v.scene.primitives.remove(points);
          v.scene.primitives.remove(billboards);
        }
      }

      categoryCollsRef.current.clear();
    };
  }, [globeReady, loadCategory]);

  return null;
}