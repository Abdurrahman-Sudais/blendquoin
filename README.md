# BlendQuoin

**Understand batch variation before it becomes waste.**

AI-powered production analytics for cosmetics and personal-care manufacturers. BlendQuoin connects ingredient lots, supplier information, manufacturing conditions and laboratory measurements to help quality teams investigate inconsistent batches and anticipate deviations in viscosity and appearance.

Founder: Temilola Ogunleye · Co-founder: Obinna Nwosu

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Sign in with **Continue with demo workspace** on `/login`, or register any account (auth is local in demo mode). Demo data persists in `localStorage`; use *Reset demo data* in the user menu to restore it.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · shadcn/ui (Radix primitives in `src/components/ui`) · React Router · Lucide · Recharts · React Hook Form + Zod · jsPDF (PDF export).

## Workflow

| Step | Module | Route |
|---|---|---|
| 1 | Register batches | `/app/batches`, `/app/batches/new`, `/app/batches/:id` |
| 2 | Connect ingredient lots (genealogy, where-used) | `/app/genealogy` |
| 3 | Analyse production data (pattern discovery) | `/app/patterns` |
| 4 | Identify potential deviations | `/app/predictions` |
| 5 | Investigate evidence (+ AI assistant) | `/app/investigations`, `/app/assistant` |
| 6 | Document findings (PDF / CSV) | `/app/reports` |

Specifications (viscosity target/range, appearance ΔE alert/limit) are configurable per product family at `/app/settings`.

## Measured vs predicted vs decided

The UI keeps three kinds of information visually and structurally separate (`src/data/types.ts`, `src/components/shared/Provenance.tsx`):

- **Measured** — `Batch.lab`, recorded laboratory values. The only basis for release.
- **Predicted** — `Prediction`, derived at runtime from the simulated model and never written into lab fields. Shown with dashed violet styling and a "Simulated" label.
- **Decided** — `QualityDecision` and `InvestigationConclusion`, attributed to a named person with a date.

Pattern discovery labels correlations as statistical associations; investigation factors stay "suspected" until a verification test confirms them.

## Demo data

`src/data/seed.ts` generates 72 batches deterministically (seeded RNG) with planted, realistic patterns:

- Carbomer lot **OP-CB-2609** (Orbis Polymer Trading) has a weaker effective viscosity than its CoA suggests and drives low-viscosity batches in Sep–Oct.
- Shea butter lot **SC-SH-2608** (Sahel Shea Cooperative) has high colour and drives appearance ΔE.
- High emulsification temperature and slow cooling add to appearance variation; MX-03 runs a consistent viscosity offset.

## AWS integration layer

All AI and data calls go through adapters in `src/services`. When `VITE_USE_AWS=true` (see `.env.example`) they call the BlendQuoin API (API Gateway → Lambda), which holds IAM credentials. The browser never calls AWS AI services directly.

| Service | Purpose | Adapter |
|---|---|---|
| Amazon SageMaker AI | Batch deviation prediction | `services/aws/sagemaker.ts` (feature vector in `toFeatureVector`) |
| Amazon Bedrock | Note classification, summaries | `services/ai/assistant.ts` |
| Amazon Textract | Lab report / CoA extraction | `services/aws/textract.ts` |
| Amazon S3 | Datasets and documents (pre-signed upload) | `services/aws/textract.ts` |
| Amazon DynamoDB | Batches, lots, genealogy edges, investigations | API routes in `services/aws/config.ts` |
| AWS Lambda | API handlers and processing workflows | — |
| Amazon Cognito | Authentication | `services/aws/cognito.ts` |
| Amazon CloudWatch | Model latency and API metrics | `services/aws/monitoring.ts` |

Until connected, predictions come from a transparent linear surrogate (`services/prediction/simulatedModel.ts`) and assistant/extraction responses are rule-based. Everything simulated is labelled as such in the UI and in exports.
