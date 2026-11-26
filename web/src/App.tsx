import type { ComponentType } from "react";

// Each feature is web/src/features/<name>/index.tsx with `export default` and `order`.
type FeatureModule = { default: ComponentType; order?: number };

const features = Object.entries(
  import.meta.glob<FeatureModule>("./features/*/index.tsx", { eager: true }),
)
  .map(([path, module]) => ({ path, ...module }))
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

export default function App() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-12 font-sans">
      {features.map(({ path, default: Feature }) => (
        <Feature key={path} />
      ))}
    </main>
  );
}
