import type { Metadata } from "next";
import { StoryPage } from "@/components/story-page";

export const metadata: Metadata = { title: "Personality" };

export default function PersonalityPage() {
  return (
    <StoryPage
      title="Personality"
      englishTitle
      pending
      description="พื้นที่สำหรับค้นพบมุมมองและตัวตนของเด็กในใจคุณ กำลังอยู่ระหว่างการออกแบบ"
      imageUrl="/images/placeholders/artworks/art005.webp"
    />
  );
}
