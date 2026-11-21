import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0f3d2e" />
      <path d="M9 22c0-6 3-11 7-13 4 2 7 7 7 13" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="20" r="3" fill="#a7f3d0" />
    </svg>
  );
}

export function Logo({ dark = false, to = "/" }: { dark?: boolean; to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <LogoMark />
      <span className={cn("text-[17px] font-semibold tracking-tight", dark ? "text-white" : "text-navy-900")}>
        Blend<span className={dark ? "text-mint-300" : "text-forest-600"}>Quoin</span>
      </span>
    </Link>
  );
}
