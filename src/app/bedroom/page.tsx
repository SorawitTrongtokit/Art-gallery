import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { BedroomScene } from "@/components/bedroom-scene";
import { DoodleStar } from "@/components/doodles";
import { bedroom, getBedroomDestinations } from "@/lib/exhibition";

export const metadata: Metadata = { title: "ห้องนอนในความทรงจำ" };

export default function BedroomPage() {
  const destinations = getBedroomDestinations();

  return (
    <section className="page-shell bedroom-page">
      <BackLink href="/">กลับหน้าแรก</BackLink>
      <header className="room-heading">
        <h1><DoodleStar className="room-heading-star" />ห้องนอนในความทรงจำ</h1>
        <p>{destinations.length ? "เลือกสิ่งของที่มีแสง เพื่อเปิดชมผลงานในแต่ละหมวด" : "กำลังเตรียมหมวดผลงานสำหรับห้องนี้"}</p>
      </header>
      <BedroomScene scene={bedroom} destinations={destinations} />
      {bedroom.sample && <p className="room-note">ภาพห้องนอนและสิ่งของที่ใช้สำรวจเป็นส่วนหนึ่งของต้นแบบ</p>}
    </section>
  );
}
