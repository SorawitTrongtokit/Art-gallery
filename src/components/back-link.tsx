import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="back-link"><ArrowLeft size={17} aria-hidden="true" /> {children}</Link>;
}
