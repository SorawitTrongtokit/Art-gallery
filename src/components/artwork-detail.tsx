"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { type PointerEvent, useEffect, useRef } from "react";
import { DoodleStar } from "@/components/doodles";
import { SafeImage } from "@/components/safe-image";
import type { Artwork } from "@/types/exhibition";

const artistFallback = "/images/placeholders/artist.svg";

function isBackdropPointer(event: PointerEvent<HTMLDialogElement>) {
  const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
  return event.target === event.currentTarget && (
    event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom
  );
}

type ArtworkDetailProps = {
  artwork: Artwork | undefined;
  index: number;
  count: number;
  onClose: () => void;
  onStep: (offset: number) => void;
  restoreFocus: () => void;
};

export function ArtworkDetail({ artwork, index, count, onClose, onStep, restoreFocus }: ArtworkDetailProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const pointerStartedOutside = useRef(false);
  const isOpen = Boolean(artwork);
  const artworkId = artwork?.id;

  useEffect(() => {
    const panel = dialog.current;
    if (!panel || isOpen === panel.open) return;

    if (isOpen) {
      panel.showModal();
      closeButton.current?.focus();
    } else {
      panel.close();
      restoreFocus();
    }
  }, [isOpen, restoreFocus]);

  useEffect(() => {
    scrollArea.current?.scrollTo(0, 0);
  }, [artworkId]);

  return (
    <dialog
      ref={dialog}
      className="artwork-dialog"
      aria-labelledby={artwork ? "artwork-detail-title" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => { pointerStartedOutside.current = event.button === 0 && isBackdropPointer(event); }}
      onPointerUp={(event) => { pointerStartedOutside.current = pointerStartedOutside.current && isBackdropPointer(event); }}
      onPointerCancel={() => { pointerStartedOutside.current = false; }}
      onClick={(event) => {
        if (pointerStartedOutside.current && event.target === event.currentTarget) onClose();
        pointerStartedOutside.current = false;
      }}
    >
      {artwork && (
        <>
          <button ref={closeButton} type="button" className="detail-close" onClick={onClose} aria-label="ปิดรายละเอียดผลงาน">
            <X size={23} aria-hidden="true" />
          </button>
          <div ref={scrollArea} className="detail-scroll">
            <div className="detail-layout">
              <div className="detail-image">
                <SafeImage src={artwork.imageUrl} alt={artwork.imageAlt} sizes="(min-width: 68rem) 515px, (min-width: 48rem) 50vw, 90vw" eager />
              </div>
              <div className="detail-copy">
                {artwork.sample && <p className="sample-text">ผลงานตัวอย่าง</p>}
                <h2 id="artwork-detail-title" aria-live="polite">{artwork.title}</h2>
                <div className="detail-artist">
                  <div className="artist-image">
                    <SafeImage src={artwork.artistImageUrl ?? artistFallback} fallback={artistFallback} alt="" sizes="52px" eager />
                  </div>
                  <p><span>ผู้สร้างผลงาน</span>{artwork.artistName}</p>
                </div>
                <div className="detail-story">
                  <h3>เรื่องราวของผลงาน</h3>
                  <p>{artwork.description}</p>
                </div>
                <DoodleStar className="detail-star" />
              </div>
            </div>
          </div>
          {count > 1 && (
            <div className="detail-controls" role="group" aria-label="เลือกชมผลงานในหมวดนี้">
              <button type="button" aria-disabled={index === 0} onClick={() => onStep(-1)}>
                <ChevronLeft size={19} aria-hidden="true" /> ก่อนหน้า
              </button>
              <span aria-live="polite">{index + 1} / {count}</span>
              <button type="button" aria-disabled={index === count - 1} onClick={() => onStep(1)}>
                ถัดไป <ChevronRight size={19} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
