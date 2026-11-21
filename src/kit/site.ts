// Site facts used by the marketing kit (forms, AWS section, progress, motion). A proposed product:
// AWS services and integrations are planned until implemented and verified.
type Stage = readonly [string, readonly string[], string];
type Pair = readonly [string, string];
type Stat = readonly [number, string, string?, string?];
export type Site = {
  name: string; email: string; founder: string;
  orgLabel: string; orgTypes: readonly string[]; useCases: readonly string[]; topics: readonly string[];
  detailLabel: string; detailProp: string; detailPlaceholder: string;
  demoTitle: string; demoIntro: string;
  progress: readonly (readonly [string, string, string])[];
  cycle: readonly string[]; marquee: readonly string[]; stats: readonly Stat[];
  aws: { why: string; stages: readonly Stage[]; across: readonly Pair[]; services: readonly Pair[] };
};

export const SITE: Site = {
  name: "BlendQuoin", email: "hello@blendquoin.com", founder: "Temilola Ogunleye",
  orgLabel: "Manufacturer type", orgTypes: ["Cosmetics manufacturer", "Personal-care manufacturer", "Contract manufacturer", "Raw-material supplier", "Other"],
  useCases: ["Batch genealogy and traceability", "Viscosity and appearance deviations", "Supplier lot variation", "Quality investigations", "Reports and documentation", "Other"],
  topics: ["Pilot programme", "Pricing", "Technical / AWS deployment", "Data and integrations", "Partnership", "Other"],
  detailLabel: "Product families and batch volume", detailProp: "production_detail", detailPlaceholder: "e.g. 2 product families · ~60 batches a month · 1 site",
  demoTitle: "See your batch variation explained.", demoIntro: "BlendQuoin is a proposed product in its building stage. A demo walks through batch genealogy, pattern discovery, deviation predictions and an investigation documented end to end, using fictional batches.",
  progress: [["2026", "Company founded", "By Temilola Ogunleye, to help quality teams explain batch variation before it becomes waste."], ["Done", "Quality method defined", "Measured, predicted and decided kept separate; every prediction explained; people make release decisions."], ["Done", "Working product demo", "Batches, ingredient genealogy, pattern discovery, predictions, investigations and reports on fictional data."], ["Done", "AWS reference architecture", "Prediction, document extraction, summaries, storage, APIs and monitoring designed."], ["Next", "First pilots", "One product family at one site, with laboratory results as the only basis for release."]],
  cycle: ["cosmetics manufacturers", "personal-care brands", "contract manufacturers"],
  marquee: ["Face creams", "Body lotions", "Emulsions", "Viscosity", "Appearance ΔE", "Ingredient lots", "Supplier variation", "Batch genealogy", "Pattern discovery", "Deviation prediction", "Investigations", "Quality teams"],
  stats: [[72, "batches in the demo dataset"], [15, "ingredient lots traced through genealogy"], [6, "suppliers compared for variation"], [6, "workflow steps from batch to report"]],
  aws: {
    why: "BlendQuoin connects ingredient lots, supplier data, process conditions and laboratory results for cosmetics and personal-care manufacturers. That means structured records, documents such as certificates of analysis, and models that must be explainable to quality teams. Designing on AWS lets it run prediction models, extract documents and store regulated quality records securely as manufacturers scale.",
    stages: [["Capture", ["Amazon S3", "Amazon Textract"], "Lab reports and certificates of analysis are uploaded and their values extracted for review."], ["Records", ["Amazon DynamoDB"], "Batches, ingredient lots, genealogy links and investigations are stored as structured records."], ["Predict", ["Amazon SageMaker AI"], "Deviation models estimate viscosity and appearance risk from lots and process conditions, with explanations."], ["Summarise", ["Amazon Bedrock"], "Investigation notes are classified and summarised for quality teams to review."], ["Serve & monitor", ["AWS Lambda", "Amazon CloudWatch"], "API handlers run the workflows; latency and model metrics are monitored."]],
    across: [["Amazon Cognito", "handles sign-in and roles"], ["AWS Lambda", "runs API handlers and processing"], ["AWS KMS", "encrypts quality records"], ["Amazon CloudWatch", "monitors models and APIs"]],
    services: [["Amazon SageMaker AI", "Predicts batch deviations from lots and process conditions."], ["Amazon Bedrock", "Classifies and summarises investigation notes."], ["Amazon Textract", "Extracts values from lab reports and certificates of analysis."], ["Amazon S3", "Stores datasets and documents."], ["Amazon DynamoDB", "Stores batches, lots, genealogy links and investigations."], ["AWS Lambda", "Runs API handlers and processing workflows."], ["Amazon Cognito", "Authenticates users."], ["Amazon CloudWatch", "Monitors model latency and API metrics."], ["AWS KMS", "Encrypts quality records."]],
  },
};
