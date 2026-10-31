import { useEffect, useRef, useState } from 'react';

const FONT_FAMILY = '"Big Shoulders Display"';

export default function Scene3D({ onChapter }: { onChapter: (index: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | undefined;

    (async () => {
      try {
        // The voxel "502" is sampled from this font, so it must be ready first.
        await document.fonts.load(`900 380px ${FONT_FAMILY}`);
        const { HQExperience } = await import('@/three/HQExperience');
        if (disposed || !canvasRef.current) return;
        const experience = new HQExperience(canvasRef.current, {
          onChapter,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          fontFamily: FONT_FAMILY,
        });
        destroy = () => experience.destroy();
        await experience.start();
        if (!disposed) setState('ready');
      } catch (err) {
        console.error('3D scene unavailable, showing static background', err);
        setState('failed');
      }
    })();

    return () => {
      disposed = true;
      destroy?.();
    };
  }, [onChapter]);

  return (
    <>
      <div className="scene-fallback fixed inset-0 z-0" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Animated 3D model of the Warehouse 502 facility in the New Mexico desert at dusk"
        className={`fixed inset-0 z-0 h-full w-full transition-opacity duration-1000 ${
          state === 'ready' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-[#090b12] transition-opacity duration-700 ${
          state === 'loading' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="font-display animate-pulse text-7xl font-black tracking-tight text-amber-500">
          502
        </span>
      </div>
    </>
  );
}
