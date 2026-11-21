import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DoodleCloud, DoodleStar } from "@/components/doodles";

type StoryPageProps = {
  title: string;
  englishTitle?: boolean;
  description: string;
  imageUrl: string;
  pending?: boolean;
};

export function StoryPage({ title, englishTitle, description, imageUrl, pending }: StoryPageProps) {
  return (
    <section className="story-section">
      <div className="page-shell story-page">
        <div className="story-copy">
          {pending && <p className="sample-text">เร็ว ๆ นี้</p>}
          <h1 className={englishTitle ? "handwritten-heading" : undefined} lang={englishTitle ? "en" : undefined}>{title}</h1>
          <p className="story-description">{description}</p>
          <Link className="back-link" href="/bedroom">สำรวจห้องนอน <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="story-art" aria-hidden="true">
          <div className="story-print">
            <div className="story-image">
              <Image src={imageUrl} alt="" fill sizes="(min-width: 51rem) 430px, 75vw" />
            </div>
          </div>
          <DoodleCloud className="story-cloud" />
          <DoodleStar className="story-star" />
        </div>
      </div>
    </section>
  );
}
