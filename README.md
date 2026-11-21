# Inner Child

Inner Child is a Thai-first interactive prototype for a school art exhibition of approximately 144 student artworks. Visitors enter an illustrated bedroom, choose an object, and browse the collection it opens. The current illustrations, artwork stories, and creator names are fictional examples.

## Local development

The app uses Next.js App Router, React, strict TypeScript, Tailwind CSS, Lucide icons, and the native HTML dialog. Content and optimized images live in the project. Next.js statically renders the routes and serves responsive image variants. The development and build scripts use Next.js's Webpack mode because the Turbopack CSS worker failed in the tested Windows environment. Node.js 24 is recommended and the minimum version for Next.js is 20.9.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. No environment variables are required.

```sh
npm run validate:content  # Check IDs, category assignments, hotspots, and image paths
npm run lint
npm run typecheck
npm run build
npm start                 # Serve the production build locally
```

## Routes and source layout

| Route | Purpose |
| --- | --- |
| `/` | Exhibition introduction and entry to the bedroom |
| `/bedroom` | Illustrated room with configurable objects. Narrow screens can pan the scene or use a list of the objects. |
| `/gallery/[slug]` | Collection identified by the slug in `categories.json` |
| `/gallery/[slug]#artwork=ART001` | Example of an artwork opening in the collection dialog. The ID must belong to that collection. |
| `/personality` | Placeholder for the personality experience |
| `/rules` | Placeholder for the visit rules |
| Unknown route | Themed not-found page with a link back to the bedroom |

`src/app` contains the routes and global styles. `src/components` contains the navigation, room, artwork gallery, dialog, and shared visual elements. `src/data` contains the editable content and `src/types/exhibition.ts` defines its schema. `public/images` holds the artwork, portraits, and illustration assets.

## Add or edit an artwork

Open `src/data/artworks.json`. To add a record, copy the shape below and supply metadata approved for public display. To edit an existing record, keep its `id` and update the relevant fields. Artwork order within each collection follows the order of its records in this file.

```json
{
  "id": "ART013",
  "title": "Artwork title",
  "artistName": "Approved display name",
  "description": "Artwork story",
  "imageUrl": "/images/artworks/ART013.webp",
  "imageAlt": "Short visual description of the artwork",
  "categoryId": "memories",
  "sample": false
}
```

- `id` must be unique and stable. Reuse the published ID when updating an image or title so existing artwork links still work.
- `categoryId` refers to a category's `id`. Use `null` to leave the record out of all public galleries. Change this field to move an artwork between collections.
- Set `sample: true` for illustrative content. The gallery and dialog identify sample records.
- Optional `thumbnailUrl` points to a separate small image for the gallery card. The dialog always uses `imageUrl` and fits the complete image within the viewing area.
- Optional `artistImageUrl` points to an approved portrait. The dialog uses a generic illustration when the portrait is omitted or cannot load. A missing artwork image receives its own fallback.

Put optimized artwork copies in `public/images/artworks` and approved portraits in `public/images/artists`. Match the filename and letter casing in the JSON. Keep photography masters in the team's archive. See [asset guidelines](ASSET_GUIDELINES.md) for export details.

## Configure categories and room objects

Edit `src/data/categories.json` to rename, add, or remove categories. `id` is referenced by artwork and hotspot records. `slug` determines the URL, so changing a published slug changes its links. `name` is the Thai heading, `englishName` is the display title, `description` is the introduction, and `accent` selects `lavender`, `peach`, `blue`, or `gold`. Set `sample: false` after the category is approved. The grid and room can display different numbers of categories and hotspots.

Edit `src/data/bedroom.json` to set the background path, pixel dimensions, and alternate text for the whole scene. A hotspot references a category ID and uses this coordinate system:

| Field | Meaning |
| --- | --- |
| `id` | Stable key for the object |
| `label` | Object name presented to visitors |
| `categoryId` | Category opened by the object |
| `x`, `y` | Left and top of the hit area, as percentages of the full painting |
| `width`, `height` | Hit area dimensions, in the same percentages |
| `enabled` | Whether the object has a link |
| `outlinePath` | Optional SVG path in the object's local `0 0 100 100` view box. The room uses a dashed outline if omitted. |
| `layerUrl` | Optional transparent image cropped to the same object bounds |
| `labelAbove` | Optional boolean to place the label above the object |

Keep `x + width` and `y + height` at or below 100. The room scales the painting and hit areas together. Per-object motion can be applied to the transparent layer in CSS, keeping the hit area steady. When removing a category, reassign its artworks or set them to `null`, then update or disable its hotspots. Run `npm run validate:content` after content edits.

## Prototype decisions to confirm

- The bedroom, its four objects, the category scheme, and the twelve illustrations are examples. The content team will decide the collection names, number of collections, and artwork assignments.
- The hero image, introduction, palette, and typography are provisional. Update the hero and introduction in `src/data/exhibition.json`, and the design tokens in `src/app/globals.css`.
- The Personality experience and Rules copy await the exhibition team's specification. Each already has its own route.
- Both social entries show a pending state. Enter official HTTPS page URLs in `src/data/exhibition.json` to activate them. The app checks the URL scheme and platform hostname. Confirm ownership of each page before configuring it.
- Confirm which names, artwork stories, and optional portraits have approval for public display before importing the media team's photographs.
