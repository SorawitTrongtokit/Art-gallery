"use client";

import { BookOpen, House, Menu, Smile, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { DoodleStar } from "@/components/doodles";

const pages = [
  { href: "/", label: "Home", Icon: House },
  { href: "/personality", label: "Personality", Icon: Smile },
  { href: "/rules", label: "Rules", Icon: BookOpen },
];

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-1.55 19.88v-7.02H7.91v-2.9h2.54V9.75c0-2.52 1.5-3.91 3.8-3.91 1.1 0 2.25.2 2.25.2v2.48h-1.27c-1.25 0-1.65.78-1.65 1.58v1.9h2.8l-.45 2.9h-2.35v7.02A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Navbar({ title, facebook, instagram }: {
  title: string;
  facebook: string | null;
  instagram: string | null;
}) {
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const isOpen = menuPath !== null && menuPath === pathname;

  const socialLinks = [
    { name: "Facebook", href: facebook, icon: <FacebookMark /> },
    { name: "Instagram", href: instagram, icon: <InstagramMark /> },
  ];

  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === "Escape" && isOpen) {
        setMenuPath(null);
        menuButton.current?.focus();
      }
    }}>
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label={`${title} – หน้าแรก`} onClick={() => setMenuPath(null)}>
          <span aria-hidden="true">{title.split(" ").map((word, index) => <span key={word}>{index > 0 && " "}{word}</span>)}</span>
          <DoodleStar className="wordmark-star" />
        </Link>

        <button
          ref={menuButton}
          type="button"
          className="menu-toggle"
          aria-expanded={isOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuPath(isOpen ? null : pathname)}
        >
          {isOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          <span>{isOpen ? "ปิดเมนู" : "เมนู"}</span>
        </button>

        <nav id="site-navigation" aria-label="เมนูหลัก" className="site-nav" data-open={isOpen}>
          <ul className="nav-pages">
            {pages.map(({ href, label, Icon }) => {
              const isSection = href === "/" && (pathname === "/bedroom" || pathname?.startsWith("/gallery/"));

              return (
                <li key={href}>
                  <Link
                    href={href}
                    lang="en"
                    className="nav-link"
                    data-active={isSection || pathname === href}
                    aria-current={pathname === href ? "page" : undefined}
                    onClick={() => setMenuPath(null)}
                  >
                    <Icon size={17} aria-hidden="true" /> {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="nav-social">
            {socialLinks.map(({ name, href, icon }) => (
              <li key={name}>
                {href ? (
                  <a href={href} className="nav-link" lang="en" target="_blank" rel="noopener noreferrer">
                    {icon} {name}<span className="sr-only" lang="th"> (เปิดในแท็บใหม่)</span>
                  </a>
                ) : (
                  <span className="nav-link nav-link-pending" role="link" aria-disabled="true" title="รอลิงก์ทางการ">
                    {icon}<span lang="en">{name}</span><span className="sr-only"> (รอลิงก์ทางการ)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
