# BlendQuoin — planned AWS architecture

BlendQuoin connects ingredient lots, supplier data, process conditions and laboratory results for cosmetics and personal-care manufacturers. That means structured records, documents such as certificates of analysis, and models that must be explainable to quality teams. Designing on AWS lets it run prediction models, extract documents and store regulated quality records securely as manufacturers scale.

This is a proposed design; the demo runs in the browser with simulated AI and fictional data.

## Stages


## Services

| Service | Role |
|---|---|
| Amazon S3 | Amazon Textract |
| AWS Lambda | Amazon CloudWatch |
| Amazon Cognito | handles sign-in and roles |
| AWS Lambda | runs API handlers and processing |
| AWS KMS | encrypts quality records |
| Amazon CloudWatch | monitors models and APIs |

## Principles

- The browser never holds AWS credentials; all calls go through the API with Cognito-issued tokens.
- AI output is labelled and reviewed by people before it changes any decision or record.
- Data is encrypted at rest with KMS and access is logged.
