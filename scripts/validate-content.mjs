import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getOfficialSocialUrl } from "../src/lib/social-url.mjs";

const dataDirectory = new URL("../src/data/", import.meta.url);
const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const readData = (name) => JSON.parse(readFileSync(new URL(`${name}.json`, dataDirectory), "utf8"));
const artworks = readData("artworks");
const categories = readData("categories");
const bedroom = readData("bedroom");
const exhibition = readData("exhibition");
const problems = [];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const imagePattern = /^\/images\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

function requireFields(record, fields, label) {
  for (const field of fields) {
    if (typeof record[field] !== "string" || !record[field].trim()) {
      problems.push(`${label}: ${field} must be a non-empty string.`);
    }
  }
}

function unique(value, seen, label) {
  if (seen.has(value)) problems.push(`${label}: duplicate value ${JSON.stringify(value)}.`);
  seen.add(value);
}

function asset(value, label) {
  if (typeof value !== "string" || !imagePattern.test(value)) {
    problems.push(`${label}: use a local /images/ path with a supported image extension.`);
    return;
  }

  try {
    let file = publicDirectory;
    for (const segment of value.slice(1).split("/")) {
      if (!readdirSync(file).includes(segment)) throw new Error("Missing or differently cased name");
      file = join(file, segment);
    }
    if (statSync(file).isFile()) return;
  } catch {
    // Check exact casing so the same path resolves on Windows and Linux.
  }
  problems.push(`${label}: image file is missing or has different filename casing (${value}).`);
}

const categoryIds = new Set();
const categorySlugs = new Set();
for (const [index, category] of categories.entries()) {
  const label = `Category ${category.id ?? index + 1}`;
  requireFields(category, ["id", "slug", "name", "englishName", "description", "accent"], label);
  if (!slugPattern.test(category.slug)) problems.push(`${label}: slug must use lowercase letters, numbers and single hyphens.`);
  if (typeof category.sample !== "boolean") problems.push(`${label}: sample must be a boolean.`);
  unique(category.id, categoryIds, `${label} id`);
  unique(category.slug, categorySlugs, `${label} slug`);
}

const artworkIds = new Set();
for (const [index, artwork] of artworks.entries()) {
  const label = `Artwork ${artwork.id ?? index + 1}`;
  requireFields(artwork, ["id", "title", "artistName", "description", "imageAlt"], label);
  unique(artwork.id, artworkIds, `${label} id`);
  if (typeof artwork.sample !== "boolean") problems.push(`${label}: sample must be a boolean.`);
  if (artwork.categoryId !== null && !categoryIds.has(artwork.categoryId)) {
    problems.push(`${label}: categoryId must be a defined category ID or null.`);
  }
  asset(artwork.imageUrl, `${label} imageUrl`);
  for (const field of ["artistImageUrl", "thumbnailUrl"]) {
    if (artwork[field] !== undefined) asset(artwork[field], `${label} ${field}`);
  }
}

const hotspotIds = new Set();
for (const [index, hotspot] of bedroom.hotspots.entries()) {
  const label = `Hotspot ${hotspot.id ?? index + 1}`;
  requireFields(hotspot, ["id", "label", "categoryId"], label);
  unique(hotspot.id, hotspotIds, `${label} id`);
  if (typeof hotspot.enabled !== "boolean") problems.push(`${label}: enabled must be a boolean.`);
  if (hotspot.enabled && !categoryIds.has(hotspot.categoryId)) problems.push(`${label}: categoryId must match an existing category.`);
  const { x, y, width, height } = hotspot;
  if (
    ![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 ||
    x + width > 100 || y + height > 100
  ) {
    problems.push(`${label}: hotspot must have nonzero dimensions and fit inside the 0–100 scene coordinates.`);
  }
  if (hotspot.outlinePath !== undefined) requireFields(hotspot, ["outlinePath"], label);
  if (hotspot.layerUrl !== undefined) asset(hotspot.layerUrl, `${label} layerUrl`);
  if (hotspot.labelAbove !== undefined && typeof hotspot.labelAbove !== "boolean") {
    problems.push(`${label}: labelAbove must be a boolean when set.`);
  }
}

requireFields(bedroom, ["alt"], "Bedroom");
if (![bedroom.width, bedroom.height].every((value) => Number.isInteger(value) && value > 0)) {
  problems.push("Bedroom: width and height must be positive image dimensions.");
}
if (typeof bedroom.sample !== "boolean") problems.push("Bedroom: sample must be a boolean.");
asset(bedroom.backgroundUrl, "Bedroom backgroundUrl");

requireFields(exhibition, ["title", "subtitle", "introduction"], "Exhibition");
asset(exhibition.heroImageUrl, "Exhibition heroImageUrl");
for (const platform of ["facebook", "instagram"]) {
  const url = exhibition.social?.[platform];
  if (url !== null && !getOfficialSocialUrl(platform, url)) {
    problems.push(`Exhibition social.${platform}: use null or an official HTTPS page on ${platform}.com.`);
  }
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`Validated ${artworks.length} artworks, ${categories.length} categories and ${bedroom.hotspots.length} hotspots.`);
}
