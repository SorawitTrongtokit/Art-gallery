export function DoodleStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className} fill="none">
      <path d="M32 4c2 17 8 23 27 27-18 3-25 11-28 28C28 42 21 34 5 32 22 27 28 21 32 4Z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="2.7" strokeLinejoin="round" />
      <path d="M33 11c2 11 5 17 16 20M28 48c-2-7-7-13-14-15" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function DoodleCloud({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 72" aria-hidden="true" className={className} fill="none">
      <path d="M28 48C9 54 9 31 30 30c0-15 26-19 36-7 13-24 45-22 53-1 23-5 36 18 21 28-9 7-19 5-24 3-8 9-27 14-44 7-15 5-35 4-44-12Z" fill="var(--paper-light)" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 52c20 13 52 11 59 9m29 5c14-2 27-9 32-14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

export function TitleOrbit() {
  return (
    <svg viewBox="0 0 460 275" aria-hidden="true" className="title-orbit" fill="none">
      <path d="M19 209c-16 18 2 26 41 23 60-5 139-31 223-66m52-24c39-18 95-47 110-70 13-22-18-22-50-14" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" />
      <path d="M30 221c-4 9 22 6 43 2m332-117c18-10 26-18 33-26" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="m418 21 6 13 15 1-11 9 3 14-13-7-13 7 2-14-10-10 15-1Z" fill="var(--star-light)" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M31 34v23M19 46l24-1M391 206v24m-12-12 24-1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
