import { Logo } from "@/components/shared/Logo";
import { FlaskConical, GitFork, Sparkles } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-forest-950 lg:block">
        <div className="grid-bg-dark absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="text-sm font-medium text-mint-300">Understand batch variation before it becomes waste.</div>
          <div className="space-y-4">
            {[
              { icon: GitFork, t: "Lot-level traceability", d: "FC26-0193 ← Carbomer OP-CB-2609 ← Orbis Polymer Trading" },
              { icon: FlaskConical, t: "Measured · Lab", d: "Viscosity 14,620 cP — below 15,000 cP specification" },
              { icon: Sparkles, t: "Predicted · Simulated", d: "Next batch: potential deviation (62% risk, confidence 0.74)" },
            ].map((c) => (
              <div key={c.t} className="flex gap-3 rounded-xl border border-forest-800 bg-forest-900/60 p-4 backdrop-blur">
                <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-mint-300" />
                <div>
                  <div className="text-sm font-semibold text-white">{c.t}</div>
                  <div className="font-mono text-xs text-forest-100/70">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-forest-100/50">© 2026 BlendQuoin</div>
        </div>
      </div>
    </div>
  );
}
