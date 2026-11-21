import { MoveHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { categoryPath } from "@/lib/exhibition";
import type { Bedroom, Category, Hotspot } from "@/types/exhibition";

type Destination = { hotspot: Hotspot; category: Category };

function HotspotLink({ hotspot, category }: Destination) {
  return (
    <Link
      href={categoryPath(category)}
      prefetch={false}
      aria-label={`${hotspot.label} – ชมหมวด${category.name}`}
      className="room-hotspot"
      data-label-above={hotspot.labelAbove}
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, width: `${hotspot.width}%`, height: `${hotspot.height}%` }}
    >
      {hotspot.layerUrl && (
        <Image src={hotspot.layerUrl} alt="" fill sizes="(min-width: 70rem) 350px, 40vw" className="hotspot-layer" />
      )}
      <svg className="hotspot-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {hotspot.outlinePath ? (
          <path d={hotspot.outlinePath} />
        ) : (
          <rect x="2" y="2" width="96" height="96" rx="13" strokeDasharray="5 4" />
        )}
      </svg>
      <span className="hotspot-label" aria-hidden="true">{hotspot.label}</span>
    </Link>
  );
}

export function BedroomScene({ scene, destinations }: { scene: Bedroom; destinations: Destination[] }) {
  return (
    <div className="bedroom-scene">
      <p className="scene-pan-hint"><MoveHorizontal size={20} aria-hidden="true" /> เลื่อนซ้าย–ขวาเพื่อสำรวจห้อง</p>
      <div className="scene-frame">
        <div className="scene-scroll" role="region" aria-label="ฉากห้องนอนที่สำรวจได้">
          <div className="scene-stage" style={{ aspectRatio: `${scene.width} / ${scene.height}` }}>
            <Image
              src={scene.backgroundUrl}
              fill
              preload
              sizes="(min-width: 83rem) 1250px, (min-width: 43rem) 95vw, 640px"
              alt={scene.alt}
            />
            {destinations.map(({ hotspot, category }) => (
              <HotspotLink key={hotspot.id} hotspot={hotspot} category={category} />
            ))}
          </div>
        </div>
      </div>
      {destinations.length > 0 && (
        <nav className="scene-shortcuts" aria-label="รายการสิ่งของในห้องนอน">
          <ul>
            {destinations.map(({ hotspot, category }) => (
              <li key={hotspot.id}>
                <Link href={categoryPath(category)} prefetch={false}>
                  <span>{hotspot.label}</span>
                  <small>{category.name}</small>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
