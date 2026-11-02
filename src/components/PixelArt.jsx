import React, { useEffect, useRef } from 'react';
import { PANEL_HEIGHT, PANEL_WIDTH, paintPanel } from '../game/art/cutscenes';
import { spriteDataUrl, spriteSize } from '../game/art/textures';

export function PixelSprite({ name, scale = 4, className = '', alt = '' }) {
  const { width, height } = spriteSize(name);
  return (
    <img
      alt={alt}
      className={`pixel-sprite ${className}`}
      height={height * scale}
      src={spriteDataUrl(name, scale)}
      width={width * scale}
    />
  );
}

// Animated cutscene frame. The canvas stays at native 256x144 and CSS scales it up crisply.
export function PanelCanvas({ scene, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const context = canvas.getContext('2d');
    const startedAt = performance.now();
    let frame = 0;
    let lastPaint = 0;

    const tick = (now) => {
      // 20fps is plenty for pixel cutscenes.
      if (now - lastPaint > 50) {
        lastPaint = now;
        paintPanel(context, scene, (now - startedAt) / 1000);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene]);

  return (
    <canvas
      className={`panel-canvas ${className}`}
      height={PANEL_HEIGHT}
      ref={canvasRef}
      width={PANEL_WIDTH}
    />
  );
}
