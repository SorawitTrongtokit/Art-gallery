import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DoodleStar, TitleOrbit } from "@/components/doodles";
import { exhibition } from "@/lib/exhibition";

export default function HomePage() {
  return (
    <section className="home-hero">
      <div className="hero-art" aria-hidden="true">
        <Image
          src={exhibition.heroImageUrl}
          alt=""
          fill
          preload
          sizes="(min-width: 56rem) 68vw, 100vw"
        />
      </div>

      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-lettering">
            <TitleOrbit />
            <h1 lang="en" className="hero-title" aria-label={exhibition.title}>
              {exhibition.title.split(" ").map((word) => <span key={word}>{word}</span>)}
            </h1>
            <DoodleStar className="hero-mini-star" />
          </div>

          <div className="hero-subtitle">
            <p>นิทรรศการศิลปะนักเรียน</p>
            <p lang="en">{exhibition.subtitle}</p>
          </div>

          <p className="hero-intro">{exhibition.introduction}</p>

          <Link href="/bedroom" className="explore-link" lang="en">
            START EXPLORING <ArrowRight size={23} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
