import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function MarketingLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn("rounded-md px-3 py-2 text-sm font-medium text-navy-600 transition-colors hover:text-navy-900", isActive && "text-forest-700")}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/register">Request a pilot</Link></Button>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white p-6">
              <Logo />
              <nav className="mt-8 flex flex-col gap-1">
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} className="rounded-md px-3 py-2 text-sm font-medium text-navy-700 hover:bg-muted">{n.label}</NavLink>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-2">
                <Button variant="outline" asChild><Link to="/login">Sign in</Link></Button>
                <Button asChild><Link to="/register">Request a pilot</Link></Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-1">
        <Suspense fallback={<div className="h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="bg-navy-950 text-navy-200">
        <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm text-navy-300">Understand batch variation before it becomes waste.</p>
          </div>
          {[
            { h: "Product", l: [["Features", "/features"], ["How it works", "/how-it-works"], ["Pricing", "/pricing"]] },
            { h: "Solutions", l: [["Quality teams", "/solutions"], ["Process engineering", "/solutions"], ["Supplier quality", "/solutions"]] },
            { h: "Company", l: [["About", "/about"], ["Contact", "/contact"], ["Sign in", "/login"]] },
          ].map((col) => (
            <div key={col.h}>
              <div className="text-xs font-semibold uppercase tracking-wider text-white">{col.h}</div>
              <ul className="mt-4 space-y-2 text-sm">
                {col.l.map(([label, to]) => (
                  <li key={label}><Link to={to} className="hover:text-mint-300">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-navy-800">
          <div className="container flex flex-col gap-2 py-6 text-xs text-navy-400 sm:flex-row sm:justify-between">
            <span>© 2026 BlendQuoin. All rights reserved.</span>
            <span>Predictions support investigation; they do not replace laboratory release testing.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
