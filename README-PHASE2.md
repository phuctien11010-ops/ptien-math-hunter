# PTIEN Math Hunter - Phase 2

Phase 2 adds the Internet search layer on top of the deterministic pipeline. It is designed to find real math problems from public web sources with URL provenance.

## What it does

- Builds many search queries from subject, grade, topic
- Queries Bing Web Search API
- Collects candidate URLs from search results
- Crawls those URLs
- Extracts page text and candidate problem statements
- Saves search results to `output/phase2/*.json`

## Requirements

- Node.js 18+
- Environment variable: `BING_SEARCH_API_KEY` for real Bing results
- Without API key, the provider falls back to demo URLs so the pipeline still runs in local development mode

## Run

```bash
# real search mode
BING_SEARCH_API_KEY=your_key_here npm run phase2 -- --grade=8 --topic="Hình bình hành" --subject="Toán" --count=20

# local demo mode
npm run phase2 -- --grade=8 --topic="Hình bình hành" --subject="Toán" --count=20
```

## Output

Results are written to:

```text
output/phase2/
```

## Important rule

Every result must retain source provenance:
- `url`
- `title`
- `snippet`
- `source` / `domain`

This keeps the system grounded in real sources instead of invented problems.
