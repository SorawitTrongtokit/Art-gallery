import artworkData from "@/data/artworks.json";
import bedroomData from "@/data/bedroom.json";
import categoryData from "@/data/categories.json";
import exhibitionData from "@/data/exhibition.json";
import type { Artwork, Bedroom, Category, Exhibition } from "@/types/exhibition";

export const exhibition: Exhibition = exhibitionData;
export const bedroom: Bedroom = bedroomData;
export const categories: Category[] = categoryData;
export const categoryPath = (category: Category) => `/gallery/${category.slug}`;

const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));
const artworksByCategory = new Map<string, Artwork[]>();
const artworks: Artwork[] = artworkData;

for (const artwork of artworks) {
  if (artwork.categoryId === null) continue;

  const collection = artworksByCategory.get(artwork.categoryId) ?? [];
  collection.push(artwork);
  artworksByCategory.set(artwork.categoryId, collection);
}

export function getCategory(slug: string) {
  return categoriesBySlug.get(slug);
}

export function getCategoryArtworks(categoryId: string) {
  return artworksByCategory.get(categoryId) ?? [];
}

export function getBedroomDestinations() {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return bedroom.hotspots.flatMap((hotspot) => {
    const category = categoriesById.get(hotspot.categoryId);
    return hotspot.enabled && category ? [{ hotspot, category }] : [];
  });
}
