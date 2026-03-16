// ============================================================
// viewModes.ts — WebGL Post-Process + CSS Filter Engine (V2)
// Replaces pure CSS filters with Cesium PostProcessStage where possible
// ============================================================

import * as Cesium from 'cesium';
import type { OpticsState } from '../stores/commandStore';

export type ViewMode = 'NORMAL' | 'NVG' | 'FLIR' | 'MONO' | 'CRT';

// CSS fallback filters (applied to the viewport container)
const CSS_FILTERS: Record<ViewMode, string> = {
  NORMAL: 'none',
  NVG: 'none',  // handled by PostProcess now
  FLIR: 'none', // handled by PostProcess now
  MONO: 'grayscale(1) contrast(1.3) brightness(0.95)',
  CRT: 'none',  // handled by PostProcess now
};

// NVG fragment shader (green night vision)
const NVG_FRAG = `
  uniform sampler2D colorTexture;
  in vec2 v_textureCoordinates;
  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float noise = fract(sin(dot(v_textureCoordinates * 500.0, vec2(12.9898, 78.233))) * 43758.5453);
    luminance += noise * 0.05;
    luminance = pow(luminance, 0.8) * 1.4;
    out_FragColor = vec4(luminance * 0.15, luminance * 1.0, luminance * 0.15, 1.0);
  }
`;

// FLIR thermal fragment shader
const FLIR_FRAG = `
  uniform sampler2D colorTexture;
  in vec2 v_textureCoordinates;
  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    // Thermal palette: dark blue → purple → red → yellow → white
    vec3 thermal;
    if (luminance < 0.25) {
      thermal = mix(vec3(0.0, 0.0, 0.2), vec3(0.4, 0.0, 0.5), luminance * 4.0);
    } else if (luminance < 0.5) {
      thermal = mix(vec3(0.4, 0.0, 0.5), vec3(0.9, 0.1, 0.1), (luminance - 0.25) * 4.0);
    } else if (luminance < 0.75) {
      thermal = mix(vec3(0.9, 0.1, 0.1), vec3(1.0, 0.85, 0.0), (luminance - 0.5) * 4.0);
    } else {
      thermal = mix(vec3(1.0, 0.85, 0.0), vec3(1.0, 1.0, 1.0), (luminance - 0.75) * 4.0);
    }
    out_FragColor = vec4(thermal, 1.0);
  }
`;

// CRT fragment shader (scanlines + vignette + slight green tint)
const CRT_FRAG = `
  uniform sampler2D colorTexture;
  in vec2 v_textureCoordinates;
  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);
    // Scanlines
    float scanline = sin(uv.y * 800.0) * 0.04;
    color.rgb -= scanline;
    // Vignette
    float vignette = smoothstep(0.8, 0.3, length(uv - 0.5));
    color.rgb *= vignette;
    // Slight phosphor green tint
    color.r *= 0.9;
    color.g *= 1.05;
    color.b *= 0.85;
    out_FragColor = color;
  }
`;

// ============================================================
// HOLLYWOOD OPTICS SHADER (V3.2)
// Custom Uber-Shader for Contrast, Brightness, Saturation, Gamma,
// Aberration, Distortion, Vignette, and Grain.
// ============================================================
const HOLLYWOOD_FRAG = `
  uniform sampler2D colorTexture;
  uniform float u_contrast;
  uniform float u_brightness;
  uniform float u_saturation;
  uniform float u_gamma;
  uniform float u_vignette;
  uniform float u_aberration;
  uniform float u_grain;
  uniform float u_distortion;
  
  in vec2 v_textureCoordinates;

  float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = v_textureCoordinates;

    // Distortion (barrel)
    if (u_distortion > 0.0) {
        vec2 d_uv = uv - 0.5;
        float rSq = dot(d_uv, d_uv);
        uv = uv + d_uv * (u_distortion * rSq);
    }

    // Chromatic Aberration
    vec2 offset = vec2(u_aberration, 0.0);
    float r = texture(colorTexture, clamp(uv + offset, 0.0, 1.0)).r;
    float g = texture(colorTexture, clamp(uv, 0.0, 1.0)).g;
    float b = texture(colorTexture, clamp(uv - offset, 0.0, 1.0)).b;
    vec3 color = vec3(r, g, b);

    // Brightness & Contrast
    color = (color - 0.5) * u_contrast + 0.5 + u_brightness;

    // Saturation
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, u_saturation);

    // Gamma correction
    if (u_gamma > 0.0) {
        color = pow(max(color, vec3(0.0)), vec3(1.0 / u_gamma));
    }

    // Vignette
    if (u_vignette > 0.0) {
        float dist = distance(v_textureCoordinates, vec2(0.5));
        color *= smoothstep(0.8, 1.0 - u_vignette, dist * (1.0 + u_vignette * 0.5));
    }

    // Film Grain
    if (u_grain > 0.0) {
        float noise = rand(uv * 100.0) * u_grain - (u_grain * 0.5);
        color += noise;
    }

    out_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

// Track active post-process stages
let activeStage: Cesium.PostProcessStage | null = null;
let nvgFlickerInterval: ReturnType<typeof setInterval> | null = null;
let nvgFlickerTimeout: ReturnType<typeof setTimeout> | null = null;

export function applyViewMode(
  container: HTMLElement | null,
  mode: ViewMode,
  viewer?: Cesium.Viewer | null
): void {
  if (!container) return;

  // Apply CSS filter
  container.classList.remove('mode-crt');
  container.style.filter = CSS_FILTERS[mode];

  // Remove previous custom post-process stage
  if (viewer && !viewer.isDestroyed() && activeStage) {
    try {
      viewer.scene.postProcessStages.remove(activeStage);
    } catch { /* already removed */ }
    activeStage = null;
  }

  // Apply WebGL post-process for NVG, FLIR, CRT
  if (viewer && !viewer.isDestroyed()) {
    let frag: string | null = null;
    if (mode === 'NVG') frag = NVG_FRAG;
    else if (mode === 'FLIR') frag = FLIR_FRAG;
    else if (mode === 'CRT') frag = CRT_FRAG;

    if (frag) {
      try {
        const stage = new Cesium.PostProcessStage({
          fragmentShader: frag,
          name: `argus_${mode.toLowerCase()}`,
        });
        viewer.scene.postProcessStages.add(stage);
        activeStage = stage;
        
        // 5. THE NVG MOMENT (0.3s flicker + 5 degree slow rotation)
        if (mode === 'NVG') {
          // Clear any old flicker timeouts
          if (nvgFlickerInterval) clearInterval(nvgFlickerInterval);
          if (nvgFlickerTimeout) clearTimeout(nvgFlickerTimeout);
          
          let brightness = 0.5;
          // Apply a fast flickering brightness via CSS as a hardware-calibrating effect
          nvgFlickerInterval = setInterval(() => {
            brightness = brightness === 0.5 ? 1.5 : 0.5;
            container.style.filter = `brightness(${brightness})`;
          }, 30);
          
          nvgFlickerTimeout = setTimeout(() => {
            if (nvgFlickerInterval) clearInterval(nvgFlickerInterval);
            container.style.filter = 'none'; // Lock into stable green phosphor
            
            // Initiate a slow 5-degree camera rotation
            const currentHeading = viewer.camera.heading;
            viewer.camera.flyTo({
               destination: viewer.camera.position,
               orientation: {
                 heading: currentHeading + Cesium.Math.toRadians(5),
                 pitch: viewer.camera.pitch,
                 roll: viewer.camera.roll
               },
               duration: 3.0,
               easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
            });
          }, 300);
        }
      } catch (e) {
        console.warn(`[ARGUS] PostProcess ${mode} failed:`, e);
        // Fall back to CSS
        if (mode === 'NVG') container.style.filter = 'brightness(1.5) contrast(1.2) hue-rotate(85deg) saturate(3) sepia(0.8)';
        if (mode === 'FLIR') container.style.filter = 'brightness(1.3) contrast(2.0) saturate(0) sepia(1) hue-rotate(10deg)';
        if (mode === 'CRT') container.classList.add('mode-crt');
      }
    }
  }
}

let hollywoodStage: Cesium.PostProcessStage | null = null;

// Apply bloom/sharpen + new Hollywood optics from store values
export function applyOptics(
  viewer: Cesium.Viewer | null,
  optics: OpticsState
): void {
  if (!viewer || viewer.isDestroyed()) return;

  // 1. Native Bloom / Sharpen mapping
  try {
    const bloomStage = viewer.scene.postProcessStages.bloom;
    bloomStage.enabled = optics.bloom > 5;
    if (optics.bloom > 5) {
      bloomStage.uniforms.contrast = 128 + optics.sharpen * 0.5;
      bloomStage.uniforms.brightness = -0.3 + (optics.bloom / 100) * 0.2;
      bloomStage.uniforms.sigma = 1.0 + (optics.bloom / 100) * 3.0;
      bloomStage.uniforms.stepSize = 1.0;
    }
  } catch { /* bloom unavailable */ }

  // 2. Custom Hollywood Shader
  if (!hollywoodStage) {
    hollywoodStage = new Cesium.PostProcessStage({
      fragmentShader: HOLLYWOOD_FRAG,
      name: 'argus_hollywood',
      uniforms: {
        u_contrast: 1.0, u_brightness: 0.0, u_saturation: 1.0, u_gamma: 1.0,
        u_vignette: 0.0, u_aberration: 0.0, u_grain: 0.0, u_distortion: 0.0
      }
    });
    viewer.scene.postProcessStages.add(hollywoodStage);
  }

  // Map 0-100 store values to GLSL normalized uniforms
  // Defaults at 50% = 1.0 scale
  hollywoodStage.uniforms.u_contrast = (optics.contrast / 50.0);
  hollywoodStage.uniforms.u_brightness = (optics.brightness - 50) / 100.0;
  hollywoodStage.uniforms.u_saturation = (optics.saturation / 50.0);
  hollywoodStage.uniforms.u_gamma = (optics.gamma / 50.0);
  hollywoodStage.uniforms.u_vignette = optics.vignette / 100.0;
  hollywoodStage.uniforms.u_aberration = (optics.aberration / 100.0) * 0.01;
  hollywoodStage.uniforms.u_grain = optics.grain / 500.0;
  hollywoodStage.uniforms.u_distortion = (optics.distortion / 100.0) * 0.5;
}
