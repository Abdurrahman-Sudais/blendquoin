import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import HomePage from "@/pages/public/HomePage";

const FeaturesPage = lazy(() => import("@/pages/public/FeaturesPage"));
const SolutionsPage = lazy(() => import("@/pages/public/SolutionsPage"));
const HowItWorksPage = lazy(() => import("@/pages/public/HowItWorksPage"));
const PricingPage = lazy(() => import("@/pages/public/PricingPage"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const DashboardPage = lazy(() => import("@/pages/app/DashboardPage"));
const BatchesPage = lazy(() => import("@/pages/app/BatchesPage"));
const BatchDetailPage = lazy(() => import("@/pages/app/BatchDetailPage"));
const NewBatchPage = lazy(() => import("@/pages/app/NewBatchPage"));
const GenealogyPage = lazy(() => import("@/pages/app/GenealogyPage"));
const PredictionsPage = lazy(() => import("@/pages/app/PredictionsPage"));
const PatternsPage = lazy(() => import("@/pages/app/PatternsPage"));
const InvestigationsPage = lazy(() => import("@/pages/app/InvestigationsPage"));
const InvestigationDetailPage = lazy(() => import("@/pages/app/InvestigationDetailPage"));
const AssistantPage = lazy(() => import("@/pages/app/AssistantPage"));
const ReportsPage = lazy(() => import("@/pages/app/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

const Fallback = () => <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="batches/new" element={<NewBatchPage />} />
          <Route path="batches/:id" element={<BatchDetailPage />} />
          <Route path="genealogy" element={<GenealogyPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          <Route path="patterns" element={<PatternsPage />} />
          <Route path="investigations" element={<InvestigationsPage />} />
          <Route path="investigations/:id" element={<InvestigationDetailPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
