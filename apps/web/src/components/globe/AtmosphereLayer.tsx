// ============================================================
// AtmosphereLayer — Volumetric Smog & AQI Haze Shader (V4.2)
// ============================================================

import { useEffect } from 'react';
import * as Cesium from 'cesium';

const SMOG_FRAG = `
  uniform sampler2D colorTexture;
  uniform float u_aqi;
  uniform vec3 u_cityPos;
  uniform float u_radius;
  in vec2 v_textureCoordinates;
  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    // Haze color (brownish yellow)
    vec3 hazeColor = vec3(0.62, 0.47, 0.2); 
    float intensity = clamp((u_aqi - 100.0) / 400.0, 0.0, 0.6);
    
    // Simple radial falloff for the city
    // In a real post-process we'd need depth, but we can do a subtle overlay
    float dist = distance(v_textureCoordinates, vec2(0.5));
    float falloff = smoothstep(0.4, 0.1, dist);
    
    color.rgb = mix(color.rgb, hazeColor, intensity * falloff);
    out_FragColor = color;
  }
`;

export function AtmosphereLayer({ viewerRef }: { viewerRef: React.RefObject<Cesium.Viewer | null> }) {
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // High-performance atmosphere settings
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    viewer.scene.globe.showGroundAtmosphere = true;

    viewer.scene.globe.atmosphereLightIntensity = 15.0;
    viewer.scene.globe.atmosphereSaturationShift = 0.2;
    viewer.scene.globe.atmosphereBrightnessShift = -0.1;

    // Custom Smog Post-Process Stage
    const smogStage = new Cesium.PostProcessStage({
        fragmentShader: SMOG_FRAG,
        uniforms: {
            u_aqi: 280.0, // Default high for demonstration
        }
    });
    
    // Only enable if AQI is high (logic can be made reactive)
    smogStage.enabled = true;
    viewer.scene.postProcessStages.add(smogStage);

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.postProcessStages.remove(smogStage);
      }
    };
  }, [viewerRef]);

  return null;
}
