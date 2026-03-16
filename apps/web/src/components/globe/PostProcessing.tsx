// ============================================================
// PostProcessing — MINIMAL. Clean look, no gimmicks.
// ============================================================

import { useEffect } from 'react';
import * as Cesium from 'cesium';

interface PostProcessingProps {
  viewerRef: React.RefObject<Cesium.Viewer | null>;
}

export function PostProcessing({ viewerRef }: PostProcessingProps) {
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Subtle bloom only — makes lights glow without washing out
    viewer.scene.postProcessStages.bloom.enabled = true;
    viewer.scene.postProcessStages.bloom.uniforms.contrast = 119;
    viewer.scene.postProcessStages.bloom.uniforms.brightness = -0.2;
    viewer.scene.postProcessStages.bloom.uniforms.glowOnly = false;
    viewer.scene.postProcessStages.bloom.uniforms.delta = 1.0;
    viewer.scene.postProcessStages.bloom.uniforms.sigma = 2.0;
    viewer.scene.postProcessStages.bloom.uniforms.stepSize = 1.0;

    // No AO, no film grain — keep it clean
    viewer.scene.postProcessStages.ambientOcclusion.enabled = false;

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.postProcessStages.bloom.enabled = false;
      }
    };
  }, [viewerRef]);

  return null;
}
