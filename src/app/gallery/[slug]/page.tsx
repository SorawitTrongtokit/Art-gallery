import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkGallery } from "@/components/artwork-gallery";
import { BackLink } from "@/components/back-link";
import { DoodleCloud, DoodleStar } from "@/components/doodles";
import { categories, getCategory, getCategoryArtworks } from "@/lib/exhibition";

type GalleryPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: GalleryPageProps): Promise<Metadata> {
  const category = getCategory((await params).slug);
  if (!category) return {};

  return { title: category.name, description: category.description };
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const category = getCategory((await params).slug);
  if (!category) notFound();

  const artworks = getCategoryArtworks(category.id);
  const allSamples = artworks.every((artwork) => artwork.sample);

  return (
    <section className="gallery-page" data-accent={category.accent}>
      <div className="page-shell">
        <BackLink href="/bedroom">กลับไปห้องนอน</BackLink>

        <header className="gallery-heading">
          <DoodleCloud className="gallery-cloud gallery-cloud-left" />
          <DoodleCloud className="gallery-cloud gallery-cloud-right" />
          <DoodleStar className="gallery-sparkle" />
          <p className="chapter-title" lang="en"><span>{category.englishName}</span></p>
          <h1 id="gallery-heading" tabIndex={-1}>{category.name}</h1>
          <p className="gallery-description">{category.description}</p>
        </header>

        {artworks.length > 0 ? (
          <>
            <div className="gallery-meta">
              <p>{artworks.length} {allSamples ? "ผลงานตัวอย่าง" : "ผลงาน"}</p>
              {category.sample && !allSamples && <span>หมวดหมู่ตัวอย่าง</span>}
            </div>
            <ArtworkGallery artworks={artworks} />
          </>
        ) : (
          <p className="gallery-empty">ผลงานในหมวดนี้กำลังจัดเตรียม</p>
        )}
      </div>
    </section>
  );
}
