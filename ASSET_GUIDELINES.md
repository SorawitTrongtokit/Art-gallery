# Exhibition asset guidelines

| Asset | What to provide | Web location |
| --- | --- | --- |
| Bedroom background | A complete widescreen illustration with room for the selected objects. Include its pixel dimensions and a short Thai visual description. | `public/images/bedroom/` |
| Optional object layers | Transparent WebP or PNG for each exported object, cropped to the declared hit area. Leave a matching gap in the background when the layer contains the complete visible object. | `public/images/bedroom/` |
| Artwork photographs | Color-corrected web copies with all edges visible and any photographic surroundings removed. Use the assigned stable ID, for example `ART001.webp`. | `public/images/artworks/` |
| Optional artist portraits | A square image approved for public display. Use a stable filename and supply it as `artistImageUrl`. | `public/images/artists/` |
| Hero, category illustrations, and decorative art | Export web copies on their own layers. Keep any text separate for accessibility and mobile layout. Category illustrations can be added when the collection design is confirmed. | `public/images/decorations/` |

Keep original photographs and editable design files outside `public`. Resize or compress web copies with WebP or AVIF, reviewing color and fine details against the originals. Preserve artwork proportions. Gallery card framing uses a display crop, and the dialog shows the complete uploaded web copy. A separate `thumbnailUrl` can be used for deliberate framing on the card.

## Replace the bedroom

1. Copy the new image into `public/images/bedroom/`. Update `backgroundUrl`, `width`, `height`, and `alt` in `src/data/bedroom.json`. Use the exported image's actual dimensions and set `sample` to `false` when the scene is approved.
2. Measure each chosen object rectangle against the full exported image. If the artwork is 1600 × 900 and the rectangle begins at `(320, 180)` and measures `240 × 270` pixels, use `x: 20`, `y: 20`, `width: 15`, and `height: 30`.
3. Reassign each hotspot's `categoryId` to its approved destination. If supplying an SVG outline, scale the local rectangle to `0 0 100 100`. If supplying a layer instead of painting the object into the scene, export the layer for exactly the same rectangle. The existing sample paths are drawn for the sample composition.
4. Run `npm run validate:content`. Check each hotspot with mouse, keyboard, and touch at wide and narrow widths. Adjust the bounds if two important hit areas overlap or if an object becomes hard to tap on a small screen.
