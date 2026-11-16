#!/bin/sh
# Re-render headphones/img/hp-<colour>.webp + hp-exploded.webp from the live 3D model (server on :8080 must be running).
# Square 300x300 @2x, transparent background. Colour ids must match headphones/js/data.js.
cd "$(dirname "$0")/.."
for c in ${@:-night sand ocean sage exploded}; do
  SHOT_TRANSPARENT=1 SHOT_DPR=2 node tools/shot.mjs "http://localhost:8080/headphones/?3d" headphones/img/hp-$c.webp 300 300 1 \
    "(async()=>{await __hp.settled; const r=__dbg.site.posterMode('$c'); await new Promise(r=>setTimeout(r,800)); return r})()"
done
