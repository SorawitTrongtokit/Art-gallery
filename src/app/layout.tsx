import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/caveat-brush/latin-400.css";
import "@fontsource-variable/noto-sans-thai";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { exhibition } from "@/lib/exhibition";
import { getOfficialSocialUrl } from "@/lib/social-url.mjs";

export const metadata: Metadata = {
  title: { default: exhibition.title, template: `%s | ${exhibition.title}` },
  description: exhibition.introduction,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
        <Navbar
          title={exhibition.title}
          facebook={getOfficialSocialUrl("facebook", exhibition.social.facebook)}
          instagram={getOfficialSocialUrl("instagram", exhibition.social.instagram)}
        />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
