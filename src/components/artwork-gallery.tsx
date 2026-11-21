"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ArtworkDetail } from "@/components/artwork-detail";
import { SafeImage } from "@/components/safe-image";
import type { Artwork } from "@/types/exhibition";

const artworkLocationEvent = "inner-child-artwork-location";
const modalHistoryKey = "innerChildGalleryPath";

function subscribeToArtworkLocation(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(artworkLocationEvent, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(artworkLocationEvent, onChange);
  };
}

const readHash = () => window.location.hash;
const readServerHash = () => "";
const artworkHash = (id: string) => `#artwork=${encodeURIComponent(id)}`;
const notifyArtworkLocation = () => window.dispatchEvent(new Event(artworkLocationEvent));

export function ArtworkGallery({ artworks }: { artworks: Artwork[] }) {
  const hash = useSyncExternalStore(subscribeToArtworkLocation, readHash, readServerHash);
  const index = artworks.findIndex((artwork) => hash === artworkHash(artwork.id));
  const trigger = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const showIndividualSampleLabels = artworks.some((artwork) => !artwork.sample);

  useEffect(() => { closing.current = false; }, [hash]);

  function openArtwork(artwork: Artwork, source: HTMLButtonElement) {
    trigger.current = source;
    window.history.pushState({ [modalHistoryKey]: window.location.pathname }, "", artworkHash(artwork.id));
    notifyArtworkLocation();
  }

  function stepArtwork(offset: number) {
    const next = artworks[index + offset];
    if (!next || closing.current) return;

    window.history.replaceState(window.history.state, "", artworkHash(next.id));
    notifyArtworkLocation();
  }

  function closeArtwork() {
    if (closing.current) return;
    closing.current = true;

    if (window.history.state?.[modalHistoryKey] === window.location.pathname) {
      window.history.back();
    } else {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
      notifyArtworkLocation();
    }
  }

  function restoreFocus() {
    const target = trigger.current?.isConnected ? trigger.current : document.getElementById("gallery-heading");
    target?.focus({ preventScroll: true });
  }

  return (
    <>
      <ul className="artwork-grid">
        {artworks.map((artwork) => (
          <li key={artwork.id}>
            <button type="button" className="artwork-card" onClick={(event) => openArtwork(artwork, event.currentTarget)} aria-haspopup="dialog">
              <span className="artwork-thumbnail">
                <SafeImage
                  src={artwork.thumbnailUrl ?? artwork.imageUrl}
                  alt=""
                  sizes="(min-width: 76rem) 278px, (min-width: 66rem) 23vw, (min-width: 48rem) 31vw, (min-width: 22rem) 47vw, 92vw"
                />
              </span>
              <span className="artwork-card-copy">
                <span className="artwork-card-title">{artwork.title}</span>
                <span className="artwork-card-credit">โดย {artwork.artistName}</span>
                {showIndividualSampleLabels && artwork.sample && <span className="sample-text">ผลงานตัวอย่าง</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ArtworkDetail artwork={artworks[index]} index={index} count={artworks.length} onClose={closeArtwork} onStep={stepArtwork} restoreFocus={restoreFocus} />
    </>
  );
}
