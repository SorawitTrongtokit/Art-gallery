import type { Metadata } from "next";
import { StoryPage } from "@/components/story-page";

export const metadata: Metadata = { title: "Rules" };

export default function RulesPage() {
  return (
    <StoryPage
      title="Rules"
      englishTitle
      pending
      description="ข้อมูลและข้อตกลงสำหรับการเข้าชมนิทรรศการจะเผยแพร่เมื่อทีมจัดงานยืนยันรายละเอียดแล้ว"
      imageUrl="/images/placeholders/artworks/art006.webp"
    />
  );
}
