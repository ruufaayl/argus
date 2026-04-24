#!/bin/bash
# Vercel Ignored Build Step: exit 0 = skip, exit 1 = build
# Only build when web-relevant files change. Skip desktop, docs, scripts, CI, etc.

# Web-relevant paths (kept in sync between the two diff invocations below)
WEB_PATHS=(
  'src/' 'api/' 'server/' 'shared/' 'public/' 'blog-site/' 'pro-test/' 'proto/' 'convex/'
  'package.json' 'package-lock.json' 'vite.config.ts' 'tsconfig.json'
  'tsconfig.api.json' 'vercel.json' 'middleware.ts' 'index.html' 'landing.html'
  'tailwind.config.ts' 'postcss.config.js'
)

# On main: build by default. Only skip if we can confirm ONLY non-web files changed.
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  if [ -n "$VERCEL_GIT_PREVIOUS_SHA" ] && git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA" 2>/dev/null; then
    WEB_CHANGES=$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- "${WEB_PATHS[@]}" | head -1)
    if [ -z "$WEB_CHANGES" ]; then
      echo "Skipping: no web-relevant changes on main"
      exit 0
    fi
  fi
  # Default on main: build (covers first deploy, force-pushes, missing PREVIOUS_SHA)
  echo "Building: main branch (no skippable diff)"
  exit 1
fi

# Skip preview deploys that aren't tied to a pull request
if [ -z "$VERCEL_GIT_PULL_REQUEST_ID" ]; then
  echo "Skipping: preview without PR"
  exit 0
fi

# Resolve comparison base: prefer VERCEL_GIT_PREVIOUS_SHA, fall back to merge-base with main
COMPARE_SHA="$VERCEL_GIT_PREVIOUS_SHA"
if [ -z "$COMPARE_SHA" ] || ! git cat-file -e "$COMPARE_SHA" 2>/dev/null; then
  COMPARE_SHA=$(git merge-base HEAD origin/main 2>/dev/null)
fi
if [ -z "$COMPARE_SHA" ]; then
  echo "Building: cannot resolve compare SHA, defaulting to build"
  exit 1
fi

# Build if any web-relevant paths changed
if git diff --name-only "$COMPARE_SHA" HEAD -- "${WEB_PATHS[@]}" | grep -q .; then
  echo "Building: web-relevant changes detected"
  exit 1
fi

echo "Skipping: no web-relevant changes"
exit 0
