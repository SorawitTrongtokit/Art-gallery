"use client";

import Image from "next/image";
import { useState } from "react";

type SafeImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  fallback?: string;
  eager?: boolean;
};

export function SafeImage({
  src,
  alt,
  sizes,
  className,
  fallback = "/images/placeholders/unavailable.svg",
  eager = false,
}: SafeImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const hasFailed = src === failedSource;
  const imageSource = hasFailed ? fallback : src;

  return (
    <Image
      key={imageSource}
      src={imageSource}
      alt={hasFailed && alt ? "ไม่สามารถแสดงภาพได้" : alt}
      sizes={sizes}
      className={className}
      fill
      unoptimized={imageSource.endsWith(".svg")}
      loading={eager ? "eager" : "lazy"}
      onError={imageSource !== fallback ? () => setFailedSource(src) : undefined}
    />
  );
}
