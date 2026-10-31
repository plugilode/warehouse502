---
name: interactive-3d-model
description: Conventions for building an interactive 3D model graphic in a Bolt web app using Three.js (via @react-three/fiber and @react-three/drei) rendered in React. Use whenever the user asks for a "3D model", "3D graphic", "interactive 3D", "spinning model", "rotate a model", "show a product in 3D", "3D scene", or any request involving loading or displaying a .glb/.gltf/.obj file the user can orbit, zoom, or pan around. Also trigger on phrases like "make it 3D", "add a 3D viewer", "render a 3D object", or "interactive model" — even when the skill name itself is not mentioned.
---

# Interactive 3D Model Graphic

Add a real, interactive 3D model to a Bolt web app so visitors can orbit, zoom, and pan around it. Built on Three.js with the React bindings `@react-three/fiber` and `@react-three/drei`, rendered inside the existing React/Vite/Tailwind app. Use this skill whenever a request calls for a 3D model, 3D scene, 3D viewer, or "make it 3D / interactive model."

## Why this stack

- `three` is the de-facto WebGL library; it renders 3D in the browser without plugins.
- `@react-three/fiber` wraps Three.js in React so the scene is declarative JSX (composes with existing components, hooks, and Tailwind layout).
- `@react-three/drei` ships the helpers that make a viewer usable in minutes: `OrbitControls`, `Environment`, `Stage`, `useGLTF`, `Html`, `PresentationControls`, loading fallbacks, and contact shadows.
- Stays inside Vite + React + TypeScript — no separate build step, no iframe, no external runtime.

## When to use what

- **User has a `.glb` / `.gltf` file** → `useGLTF` + `<primitive object={scene} />`. This is the common case.
- **No model file, just "make it 3D / a 3D graphic"** → build the model from `drei` / Three.js primitives (`<boxGeometry>`, `<Sphere>`, `<RoundedBox>`, `<Float>`, `<Text3D>`) so there is something to render without an external asset. A floating, gently-rotating geometric object often reads as a "3D model graphic" and needs no download.
- **Product/configurator vibe** → `<PresentationControls>` for a constrained, drag-to-rotate feel with spring-back.
- **Full inspect-the-model vibe** → `<OrbitControls>` with damping and min/max distance so users can orbit freely without losing the model.
- **Hero/showcase vibe** → `<Stage>` auto-lights and centers the model; drop it in a `<Canvas>` with `camera` positioned and a subtle `<Float>` for life.

Always give the model light. At minimum an `<Environment preset="city" />` (or `"studio"`/`"sunset"`) for reflections, plus `contactShadow` or `<ContactShadows>` for grounding. A model with no environment looks flat and broken.

## Workflow

1. **Install the runtime deps.** Add `three`, `@react-three/fiber`, `@react-three/drei` to `package.json` and run the install. Pin Three.js to a major version that matches `@react-three/fiber`'s peer range — version mismatches are the #1 cause of "nothing renders" bugs. After install, verify `package.json` actually lists all three packages before writing any component code.

2. **Exclude Three from Vite's dep pre-bundling** so the WASM/worker bundles load correctly. In `vite.config.ts`, add `three`, `@react-three/fiber`, and `@react-three/drei` to `optimizeDeps.exclude`. Without this, Vite can drop worker chunks and the canvas stays blank.

3. **Create one component per model**, typically `src/components/Model3D.tsx`. Keep the `<Canvas>` and its scene in that file so the rest of the app treats 3D like any other React component. Suggested shape:
   - Default export a `Model3D` component that renders `<Canvas>` with `shadows`, `dpr={[1, 2]}`, `camera={{ position: [x, y, z], fov: 45 }}`.
   - Inside: `<Suspense fallback={null}>` wrapping the model + lights + environment.
   - An `<Html>`-based or sibling-DOM loading fallback (spinner / "Loading model…") shown until Suspense resolves.
   - `<OrbitControls>` or `<PresentationControls>` for interactivity.
   - A subtle `<Float>` or auto-rotate (`<PresentationControls snap>`, or `autoRotate` on controls) so the model has life even untouched.

4. **Drop `<Model3D />` into the page** like any React component — inside a `div` with a fixed height (`h-[60vh]`, `aspect-video`, etc.). A `<Canvas>` with no height renders at 0px; always constrain the container.

5. **Provide a loading state.** Models load asynchronously. Wrap the model in `<Suspense>` and render an `Html` spinner or a CSS placeholder. A blank canvas during load looks broken.

6. **Respect reduced motion.** If `prefers-reduced-motion` is set, disable auto-rotation and float animations; keep the model static but still orbitable. Users who ask for less motion still want to see the model.

7. **Verify the build.** Run `npm run build` after wiring it up. Three.js is large — confirm the build completes and the bundle includes the worker chunks. Type-check (`tsc --noEmit`) catches JSX typing issues from `@react-three/fiber`'s intrinsic elements.

## Conventions that matter

- **One Canvas per page** unless you have a concrete reason for more. Multiple `<Canvas>` elements multiply GPU contexts and cost perf. If you need several 3D objects, put them in one scene.
- **Keep heavy logic out of the render loop.** Use `useFrame` sparingly — only for subtle motion (rotation, float). Don't do data fetching or state updates inside `useFrame`; it runs every frame.
- **Dispose properly.** `useGLTF.preload(url)` if the same model is used repeatedly. Three.js objects hold GPU memory; letting React unmount them via `<Suspense>` is usually enough, but avoid re-creating geometries/materials on every render.
- **Color management.** Set `<Canvas gl={{ toneMapping: THREE.ACESFilmicToneMapping }}>` or use `drei`'s `<Stage>` which handles this. Flat `flatShading` materials look cheap; default to PBR (`meshStandardMaterial`) with an environment for realism.
- **Accessibility.** Add an `aria-label` to the canvas container describing the model, and a text caption nearby. A 3D viewer is useless to screen readers without it; sighted users also benefit from a label like "Drag to rotate."
- **Performance ceiling.** Cap `dpr` at 2 (`dpr={[1, 2]}`) to avoid melting mobile GPUs. Disable shadows on mobile if the model is complex, or use `ContactShadows` (cheap) instead of full shadow maps.

## Example: loading a .glb model with orbit controls

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows, Html, Float } from '@react-three/drei';
import { Suspense } from 'react';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
}

export default function Model3D({ url }: { url: string }) {
  return (
    <div className="h-[60vh] w-full" aria-label="Interactive 3D model — drag to rotate">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3, 2, 5], fov: 45 }}>
        <Suspense fallback={<Html center><span className="text-white">Loading model…</span></Html>}>
          <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
            <Model url={url} />
          </Float>
          <ContactShadows position={[0, -1, 0]} opacity={0.6} scale={12} blur={2.4} far={4} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3} maxDistance={10} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}
```

## Example: a no-asset 3D graphic (built from primitives)

When there is no model file, render a floating, lit geometric object so "3D model graphic" still delivers:

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Float, RoundedBox, ContactShadows } from '@react-three/drei';

export default function Model3D() {
  return (
    <div className="h-[60vh] w-full" aria-label="Interactive 3D graphic — drag to rotate">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3, 2, 5], fov: 45 }}>
        <Float speed={1.4} rotationIntensity={0.8} floatIntensity={1}>
          <RoundedBox args={[2, 2, 2]} radius={0.15} smoothness={4} castShadow>
            <meshStandardMaterial metalness={0.6} roughness={0.25} color="#f59e0b" />
          </RoundedBox>
        </Float>
        <ContactShadows position={[0, -1.2, 0]} opacity={0.5} scale={12} blur={2.6} far={4} />
        <Environment preset="sunset" />
        <OrbitControls enablePan={false} minDistance={4} maxDistance={10} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}
```

This second pattern is the fallback when a request says "3D model graphic" but supplies no asset — it still gives the user something real, lit, and orbitable, without guessing at a URL or downloading a random model.

## Don't

- Don't load a model from a guessed URL. Only use a model file the user provides (dropped into the project or pasted as a URL), or fall back to the primitive-graphic pattern above. Guessing URLs produces 404s and a blank canvas.
- Don't ship without a loading state. A 3D viewer that flashes blank while loading reads as broken.
- Don't add OrbitControls and autoRotate simultaneously without thinking — autoRotate fights the user's drag. If autoRotate is on, it's fine to keep it (controls pause rotation while dragging and resume after); just don't set `autoRotateSpeed` so high it's distracting.
- Don't import `three` core and the React wrappers with mismatched major versions — pick the version of `@react-three/fiber`'s peer range and install that exact `three`.
