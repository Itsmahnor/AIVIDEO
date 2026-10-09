# Repository Guidelines

## Stack

- TypeScript with strict mode enabled
- React + Vite for the web application
- Express + MongoDB for the API
- Remotion for video
- Zod for schemas
- npm workspaces for package management

## Remotion

- Rendering must be deterministic. Never use `Math.random`, `Date.now`, `setTimeout`, CSS transitions, or CSS animations.
- Drive every animation with `useCurrentFrame`, `interpolate()`, and `spring()`.
- Use `Sequence` or `TransitionSeries` for timing.
- Use `Img` and `Audio` from `remotion`, `staticFile` for assets, and `@remotion/google-fonts` for fonts.
- Pin every `remotion` and `@remotion/*` dependency to the same exact version.
- Never hard-code colors or fonts in scenes; read them from brand-theme tokens.
- Every scene template must have a Zod props schema and be registered in the central registry.

## Project hygiene

- Keep files small and fully typed.
- Add a short README note to each package.
