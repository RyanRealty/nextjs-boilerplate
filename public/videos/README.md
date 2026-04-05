# Hero video

Place the homepage hero background video here:

- **Filename:** `hero.mp4`
- **Source:** Copy from `Bend Oregon Old Mill District.mp4` (or your chosen hero clip).
- **Optimized output:** `hero-optimized.mp4` (used by homepage fallback)

The site uses `hero-optimized.mp4` when no hero video URL is set in **Admin → Site pages → Homepage hero**.

To reprocess after replacing `hero.mp4`, run:

```bash
npm run video:reprocess:hero
```
