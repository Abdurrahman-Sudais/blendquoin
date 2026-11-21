import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bot, Boxes, ChevronDown, FileText, FlaskConical, GitFork, LayoutDashboard, LogOut, Menu, Network, RotateCcw, ScanSearch, Search, Settings, Sparkles,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SECTIONS = [
  {
    label: "Overview",
    items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Workflow",
    items: [
      { to: "/app/batches", label: "Batches", icon: Boxes, step: 1 },
      { to: "/app/genealogy", label: "Batch genealogy", icon: GitFork, step: 2 },
      { to: "/app/patterns", label: "Pattern discovery", icon: Network, step: 3 },
      { to: "/app/predictions", label: "Deviation prediction", icon: Sparkles, step: 4 },
      { to: "/app/investigations", label: "Investigations", icon: ScanSearch, step: 5 },
      { to: "/app/reports", label: "Reports", icon: FileText, step: 6 },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/app/assistant", label: "AI assistant", icon: Bot },
      { to: "/app/settings", label: "Specifications & AWS", icon: Settings },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { investigations } = useStore();
  const open = investigations.filter((i) => i.status !== "Closed").length;
  return (
    <div className="flex h-full flex-col bg-navy-950 text-navy-200">
      <div className="flex h-16 items-center px-5"><Logo dark to="/app" /></div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {SECTIONS.map((sec) => (
          <div key={sec.label}>
            <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy-400">{sec.label}</div>
            <ul className="space-y-0.5">
              {sec.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={"end" in item ? item.end : false}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                        isActive ? "bg-forest-900 text-white" : "text-navy-200 hover:bg-navy-900 hover:text-white"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn("h-4 w-4", isActive ? "text-mint-300" : "text-navy-400 group-hover:text-navy-200")} />
                        <span className="flex-1">{item.label}</span>
                        {"step" in item && <span className="font-mono text-[10px] text-navy-500">0{item.step}</span>}
                        {item.to === "/app/investigations" && open > 0 && <span className="rounded bg-orange-500/20 px-1.5 text-[10.5px] font-semibold text-orange-300">{open}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-violet-400/20 bg-violet-500/10 p-3 text-[11.5px] leading-relaxed text-violet-100">
        <div className="mb-1 flex items-center gap-1.5 font-semibold"><Sparkles className="h-3.5 w-3.5" /> Demo environment</div>
        AI predictions and assistant responses are simulated. AWS integration layer is ready.
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const { resetDemo, batches } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim().toUpperCase();
    if (!term) return;
    const b = batches.find((x) => x.id.toUpperCase() === term);
    if (b) navigate(`/app/batches/${b.id}`);
    else navigate(`/app/batches?q=${encodeURIComponent(q.trim())}`);
    setQ("");
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><SidebarNav /></aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0 text-white"><SidebarNav onNavigate={() => setMobileOpen(false)} /></SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></Button>
          <form onSubmit={onSearch} className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to batch ID, product or lot…" className="h-9 w-full rounded-md border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-forest-300 focus:bg-white" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground md:flex">
              <FlaskConical className="h-3.5 w-3.5 text-forest-600" /> {user?.organisation ?? "Demo Cosmetics Ltd"}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-muted">
                <Avatar><AvatarFallback>{user?.initials ?? "AO"}</AvatarFallback></Avatar>
                <div className="hidden text-left sm:block">
                  <div className="text-[13px] font-medium leading-tight">{user?.name}</div>
                  <div className="text-[11px] leading-tight text-muted-foreground">{user?.role}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/app/settings"><Settings /> Specifications & AWS</Link></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { resetDemo(); toast.success("Demo data restored"); }}><RotateCcw /> Reset demo data</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { logout(); navigate("/"); }}><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
