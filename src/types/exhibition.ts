export type Artwork = {
  id: string;
  title: string;
  artistName: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  thumbnailUrl?: string;
  artistImageUrl?: string;
  categoryId: string | null;
  sample: boolean;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  englishName: string;
  description: string;
  accent: string;
  sample: boolean;
};

export type Hotspot = {
  id: string;
  label: string;
  categoryId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
  outlinePath?: string;
  layerUrl?: string;
  labelAbove?: boolean;
};

export type Bedroom = {
  backgroundUrl: string;
  alt: string;
  width: number;
  height: number;
  sample: boolean;
  hotspots: Hotspot[];
};

export type SocialPlatform = "facebook" | "instagram";

export type Exhibition = {
  title: string;
  subtitle: string;
  introduction: string;
  heroImageUrl: string;
  social: Record<SocialPlatform, string | null>;
};
