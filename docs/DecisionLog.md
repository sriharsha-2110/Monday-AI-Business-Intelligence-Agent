# Decision Log - monday-bi-agent

This document captures the key architectural assumptions, engineering trade-offs, design decisions, and future plans for the Monday.com Business Intelligence Agent.

## 1. Assumptions

* **GraphQL API Structure**: We assume monday.com boards use the standard GraphQL v2 API (`2024-01` stable version). We assume cursor-based pagination is necessary for high-volume boards.
* **Flexible Column Matching**: Since monday.com columns have user-defined titles and IDs (e.g. `numbers_1`, `status_4`), we assume matching fields case-insensitively using common keyword patterns (e.g., matching "revenue" for column headers containing "revenue", "value", or "amount") is the most robust way to handle dynamic board structures without forcing strict column ID configuration.
* **Data Ingestion Parity**: We assume deals boards track sales opportunities (value, stage, close date, sector) and work orders boards track delivery operations (completion status, due date, priority).

## 2. Technical Trade-offs

### A. Client-Side Chat Memory vs. Database Persistence
* **Decision**: Manage conversation history inside the Next.js frontend state and pass the recent history array inside the `/chat` request payload.
* **Trade-off**: Keeps the FastAPI backend entirely stateless and lightweight. It eliminates the need for a database (e.g., PostgreSQL/Redis) on Render, which saves hosting costs and prevents single points of failure. The trade-off is that clearing/reloading the browser tab resets the context memory.

### B. Pre-Calculated Python Metrics vs. Raw LLM Arithmetic
* **Decision**: Compute exact mathematical totals (e.g. Total closed won revenue, win rates, completion counts) in Python using Pandas/dictionary logic before feeding the dataset to OpenAI GPT-4o-mini.
* **Trade-off**: LLMs are prone to arithmetic errors and hallucinated sums when aggregating large arrays of numbers. Pre-computing KPIs ensures 100% mathematical accuracy for founder questions while letting the LLM focus on qualitative trends, risk analysis, and recommendations.

### C. Next.js Static Export vs. Node Server SSR
* **Decision**: Configure Next.js with `output: 'export'` and deploy as a Render Static Site.
* **Trade-off**: Deploying the frontend as a static site is faster, free on Render, and scales infinitely via CDN. The trade-off is that Next.js Server-Side Rendering (SSR) is disabled, but since all board querying is done via asynchronous API requests to the FastAPI backend, SSR is not required.

## 3. Leadership Update Interpretation

* **Structure**: Enforced strict sections (Executive Summary, Revenue, Pipeline, Operations, Risks, Recommendations, Missing Data) using OpenAI system prompt configurations.
* **Warning Ingestion**: Embedded data warnings in the LLM context so data quality risks are dynamically generated in the report, highlighting that poor data entry directly impacts business reporting accuracy.

## 4. Future Improvements

1. **Monday.com Webhooks**: Set up real-time webhooks on monday.com to notify the backend of column updates, allowing instant UI cache refreshes.
2. **Dynamic UI Mapper**: Build a settings panel in the frontend where users can manually map monday.com columns to the agent's expected schemas (e.g., map custom fields to `revenue` or `status`).
3. **Database Integration**: Add a lightweight PostgreSQL/Supabase database to persist chat logs, user feedback, and generate historical comparison charts.
