# Threadline Init UX Research

_Note: the exact Ultrafix/Almanac repos were not clearly identifiable from primary-source search, so this comparison uses adjacent first-party CLIs instead._

## What helps new users

- `create-next-app` makes the first run feel guided: it starts interactive by default, asks only a few key setup questions, and advertises that the default template already sets up a working app. It also exposes a plain `--help` path for discovery. Source: [Next.js create-next-app README](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
- `create-vite` keeps the entry point very short, then lets the user follow prompts. It also allows the project name and template to be supplied directly, including `.` to scaffold in the current directory. Source: [Vite create-vite README](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/README.md).
- `create-t3-app` frames the template as generated around the user’s needs, which is a good cue for an init flow that feels tailored rather than prescriptive. It explicitly says to answer command-prompt questions and points advanced users to separate CLI docs. Source: [create-t3-app README](https://github.com/t3-oss/create-t3-app).
- `Biome` is not an init tool, but its onboarding posture is useful: sane defaults, minimal configuration, and detailed diagnostics. Source: [Biome README](https://raw.githubusercontent.com/biomejs/biome/main/packages/%40biomejs/biome/README.md).

## What power users get

- `create-next-app` surfaces a broad set of overrides: `--ts/--js`, `--tailwind`, `--src-dir`, `--import-alias`, `--empty`, package-manager switches, example bootstrapping, `--skip-install`, `--disable-git`, and `--yes` to suppress prompts. Source: [Next.js create-next-app README](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
- `create-vite` exposes the two core knobs up front: project name and template. That keeps the CLI small while still covering advanced scaffolding cases. Source: [Vite create-vite README](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/README.md).
- `create-t3-app` keeps the README high level and delegates advanced usage to CLI docs, which is a nice separation once the interactive path gets opinionated. Source: [create-t3-app README](https://github.com/t3-oss/create-t3-app).

## Common default / auto-detect behavior

- Interactive by default is the norm across the scaffolders.
- Next.js adds a useful extra: it detects offline mode and falls back to the local package cache.
- Defaults should be strong enough that `init` works with little input, but explicit flags must win when users already know what they want.
- Current-directory scaffold support is a good escape hatch for experienced users who do not want a new folder.
- A minimal-config posture helps keep `init` from turning into a ceremony generator.

## Recommendation for `threadline init`

Threadline should follow the “detect first, ask only when ambiguous” pattern.

1. Auto-detect the repo shape, then print a short summary before writing anything.
2. Make the interactive path the default, but keep a clean non-interactive mode via `--yes` or `--defaults`.
3. Surface only the overrides that matter most for Threadline’s domain, such as framework, styling, design system, and any source-root or alias settings.
4. Let explicit flags override detection without extra prompts.
5. Keep the number of first-run questions low, and push niche options behind `--help` or advanced docs.

## What to avoid

- Do not force a long questionnaire when detection can fill in most values.
- Do not bury the non-interactive path.
- Do not ship a huge matrix of flags on day one unless they map to real, repeated user intent.
- Do not make users specify a template when what they really need is a sensible default plus a few overrides.
