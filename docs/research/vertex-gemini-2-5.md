# Tool: Gemini 2.5 Pro / Flash (Vertex AI direct)

> Verified 2026-05-06. Sources: Google Cloud Vertex AI pricing page, Gemini 2.5 Flash model page, Gemini 2.5 Pro model page, Anthropic pricing docs.

---

## What it does

Runs Google's Gemini 2.5 Pro and Flash models via Vertex AI — giving Claude Code a second inference engine for bulk, long-context, and structured-output tasks at 10–20x lower cost than Claude Sonnet for equivalent throughput.

---

## When to use Gemini vs Claude vs OpenAI GPT-4

| Task | Best choice | Why |
|---|---|---|
| Caption variants from a source post (5 platforms) | Gemini 2.5 Flash | $0.30/MTok in, $2.50/MTok out. Handles 1M-token context. Reliable JSON mode. |
| TikTok trending classifier (50 posts → match/no-match) | Gemini 2.5 Flash | Bulk classification at lowest cost; temp 0.0 + responseSchema gives clean boolean output. |
| Viral scorecard against VIRAL_GUARDRAILS rubric | Gemini 2.5 Flash | Single long system prompt (stable across requests) → cache hit at $0.03/MTok. JSON return. |
| Synthesize 5 housing-news articles into 100-word summary | Gemini 2.5 Flash | Cheapest option; grounding can pull live article text if URLs provided. |
| Architecture decisions, complex multi-system debugging | Claude Sonnet 4.6 | Better instruction-following, safer for code that ships to production. |
| First-draft video beat scripts from verified market data | Claude Sonnet 4.6 or Gemini 2.5 Pro | Pro for hardest synthesis; Flash for drafts Matt will refine. |
| Long-document research synthesis (>200K tokens) | Gemini 2.5 Flash or Pro | Both have 1M-token context window. Claude Sonnet 4.6 also has 1M but costs 10× more. |
| Final QA + code review before ship | Claude Sonnet 4.6 | Per CLAUDE.md: Opus/Sonnet keeps architecture, final review. |
| OpenAI drop-in compatibility needed | Gemini via OpenAI-compatible endpoint | Both models expose `/v1/chat/completions` endpoint on Vertex AI. |

**Cost comparison (standard pay-as-you-go, per 1M tokens):**

| Model | Input | Output | Cached input |
|---|---|---|---|
| Gemini 2.5 Flash (≤200K ctx) | $0.30 | $2.50 | $0.03 |
| Gemini 2.5 Pro (≤200K ctx) | $1.25 | $10.00 | $0.13 |
| Gemini 2.5 Pro (>200K ctx) | $2.50 | $15.00 | $0.25 |
| Claude Sonnet 4.6 (any ctx) | $3.00 | $15.00 | $0.30 (cache read) |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 (cache read) |

**Flash vs Claude Sonnet 4.6 for bulk content:** Flash input is 10× cheaper ($0.30 vs $3.00), output is 6× cheaper ($2.50 vs $15.00). For 1,000 caption-generation jobs each consuming 2K tokens in + 500 tokens out, Flash costs ~$1.85 vs Sonnet's ~$13.50.

**Flash batch pricing:** $0.15/MTok in, $1.25/MTok out (50% discount). Use for non-time-sensitive classification jobs.

---

## Auth + endpoint (verified 2026-05-06)

### REST endpoint

```
POST https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/{MODEL_ID}:generateContent
```

**Verified model IDs:**
- `gemini-2.5-flash` (stable GA)
- `gemini-2.5-pro` (stable GA, released 2025-06-17)
- `gemini-2.5-flash-preview-09-2025` (preview channel — avoid for production)

**Project for Ryan Realty:** `ryan-realty-tc` (confirmed in task brief; smoke-test returned OK 2026-05-06)

**Auth:** Application Default Credentials via `gcloud auth application-default login` or a service account key. The SDK handles token refresh automatically.

### Node.js SDK — use `@google/genai` (NOT `@google-cloud/vertexai`)

The older `@google-cloud/vertexai` package is deprecated as of 2025-06-24 and will be removed 2026-06-24. Use the new unified SDK:

```bash
npm install @google/genai
```

**Client initialization (Vertex AI mode):**

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  vertexai: true,
  project: 'ryan-realty-tc',
  location: 'us-central1',
});
```

**Basic call:**

```javascript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Your prompt here',
  config: {
    systemInstruction: 'You are a real estate content assistant.',
    temperature: 0.7,
  },
});
console.log(response.text);
```

---

## Pricing (verified 2026-05-06)

Source: https://cloud.google.com/vertex-ai/generative-ai/pricing

### Gemini 2.5 Flash — standard pay-as-you-go

| Token type | Price per 1M tokens |
|---|---|
| Text/video input (≤200K or >200K ctx) | $0.30 |
| Audio input | $1.00 |
| Text output | $2.50 |
| Cached text/video input | $0.03 |
| Cached audio input | $0.10 |

**Batch (async):** $0.15 in / $1.25 out (50% off standard).

**Grounding with Google Search:** 1,500 free grounded prompts/day (shared with Flash-Lite). Beyond that: $35/1,000 grounded prompts. Enterprise web grounding: $45/1,000.

### Gemini 2.5 Pro — standard pay-as-you-go

| Token type | ≤200K context | >200K context |
|---|---|---|
| Input | $1.25/MTok | $2.50/MTok |
| Output | $10.00/MTok | $15.00/MTok |
| Cached input | $0.13/MTok | $0.25/MTok |

**Batch:** $0.625/MTok in, $5.00/MTok out (≤200K).

**Grounding with Google Search:** 10,000 free grounded prompts/day. Beyond that: $35/1,000.

### Context caching economics

Cache writes are not separately billed on Gemini — subsequent reads hit at $0.03/MTok (Flash) or $0.13/MTok (Pro). For a stable 4K-token system prompt used across 1,000 requests: cached read cost ≈ $0.12 (Flash) vs $0.52 (Pro) vs $1.20 (Sonnet 4.6 cache read). Flash caching is the clear winner for stable, repeated system prompts.

---

## Optimal parameters for our use cases

### Caption-variant generation (creative, 5 outputs)

```javascript
config: {
  temperature: 0.9,           // high diversity across platforms
  topP: 0.95,
  responseMimeType: 'application/json',
  responseSchema: captionVariantsSchema,
  maxOutputTokens: 2048,
}
```

### Structured classification (trending-topic matching, scorecard scoring)

```javascript
config: {
  temperature: 0.0,           // deterministic
  responseMimeType: 'application/json',
  responseSchema: classificationSchema,
  maxOutputTokens: 512,
}
```

### Market data → narrative paragraph

```javascript
config: {
  temperature: 0.3,           // creative enough to vary sentence structure, grounded enough to not hallucinate
  maxOutputTokens: 512,
  systemInstruction: 'Return only the narrative paragraph. No preamble. No markdown.',
}
```

### Safety settings

For gemini-2.5-flash, safety filters default to OFF. For Pro, the defaults are more conservative. To explicitly configure:

```javascript
config: {
  safetySettings: [
    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  ],
}
```

Note: `BLOCK_NONE` is a restricted setting on GA models and may require Google to explicitly enable it on your project. Real-estate content does not trigger safety filters at default settings — this is only needed if classification tasks involve screening for harmful content samples.

### Grounding with Google Search

```javascript
config: {
  tools: [{ googleSearch: {} }],
}
```

Response includes `groundingMetadata` with `webSearchQueries` and `groundingChunks` (source URLs + snippets). Parse these for citation generation.

---

## Response schema structure for `responseSchema`

```javascript
import { Type } from '@google/genai';

// Caption variants schema
const captionVariantsSchema = {
  type: Type.OBJECT,
  properties: {
    instagram: { type: Type.STRING },
    tiktok:    { type: Type.STRING },
    facebook:  { type: Type.STRING },
    linkedin:  { type: Type.STRING },
    x:         { type: Type.STRING },
  },
  required: ['instagram', 'tiktok', 'facebook', 'linkedin', 'x'],
};

// Classification schema
const classificationSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      topic:    { type: Type.STRING },
      relevant: { type: Type.BOOLEAN },
      reason:   { type: Type.STRING },
    },
    required: ['topic', 'relevant', 'reason'],
  },
};
```

---

## 5 Worked examples

### 1. Generate 5 platform-specific captions from a 200-word source post

```javascript
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ vertexai: true, project: 'ryan-realty-tc', location: 'us-central1' });

const sourcePost = `[200-word post about Bend market conditions]`;

const schema = {
  type: Type.OBJECT,
  properties: {
    instagram: { type: Type.STRING, description: 'Max 2,200 chars, 3–5 hashtags, hook first line' },
    tiktok:    { type: Type.STRING, description: 'Max 150 chars, trending hook, 1–2 hashtags' },
    facebook:  { type: Type.STRING, description: 'Max 500 chars, conversational, no hashtags' },
    linkedin:  { type: Type.STRING, description: 'Max 700 chars, professional tone, data-forward' },
    x:         { type: Type.STRING, description: 'Max 280 chars, punchy, 1 hashtag' },
  },
  required: ['instagram', 'tiktok', 'facebook', 'linkedin', 'x'],
};

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `Source post:\n${sourcePost}\n\nGenerate platform-specific captions. No banned words: stunning, nestled, boasts, charming, breathtaking, must-see, dream home, meticulously maintained, truly, luxurious.`,
  config: {
    systemInstruction: 'You write copy for Ryan Realty, a Bend, Oregon residential brokerage. Direct voice. Specific numbers over adjectives.',
    temperature: 0.85,
    responseMimeType: 'application/json',
    responseSchema: schema,
  },
});

const captions = JSON.parse(response.text);
// captions.instagram, .tiktok, .facebook, .linkedin, .x
```

**Estimated cost per call:** ~600 tokens in + ~400 tokens out = $0.0002 (Flash standard). 1,000 calls/month = $0.20.

---

### 2. Classify 20 TikTok trending topics against Bend real-estate niche

```javascript
const topics = [
  'Bend housing prices 2026',
  'van life Oregon',
  'Oregon trail national park',
  // ... 17 more
];

const schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      topic:    { type: Type.STRING },
      relevant: { type: Type.BOOLEAN },
      reason:   { type: Type.STRING },
      angle:    { type: Type.STRING, description: 'If relevant: specific Ryan Realty content angle to ride this trend' },
    },
    required: ['topic', 'relevant', 'reason'],
  },
};

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `Classify each topic as relevant or not to a Bend, Oregon residential real estate brokerage's TikTok channel. Relevant = we can authentically post on this topic and it reaches home buyers/sellers/investors.\n\nTopics:\n${JSON.stringify(topics)}`,
  config: {
    temperature: 0.0,
    responseMimeType: 'application/json',
    responseSchema: schema,
  },
});

const classifications = JSON.parse(response.text);
const relevant = classifications.filter(c => c.relevant);
```

**Estimated cost per call:** ~400 tokens in + ~600 tokens out = $0.0002 (Flash). Classify 50 batches/month = $0.01.

---

### 3. Score a draft against VIRAL_GUARDRAILS rubric — return JSON scorecard

```javascript
// System prompt (stable across all scoring calls — cache it)
const systemPrompt = `You are a viral video quality scorer for Ryan Realty, Bend OR.
Score the provided video beat script against the 10-category VIRAL_GUARDRAILS rubric below.
Return ONLY valid JSON matching the schema.

RUBRIC:
1. Hook (0-10): motion by 0.4s, content text by 1.0s, specific element (number/place/claim) in first 2s
2. Retention (0-10): 25%/50%/75% pattern interrupts present, final 15% kinetic reveal
3. Text overlays (0-10): safe zone, ≥48px body, ≥64px headlines, <8 words/block, units on numbers
4. Audio (0-10): ElevenLabs Victoria only, sentences ≤2 clauses, no banned words
5. Format (0-10): 30-45s duration, ≥12 beats, ≥3 motion types, no beat >4s
6. Engagement trigger (0-10): curiosity gap, counterintuitive claim, or social proof in hook
7. Cover frame (0-10): readable thumbnail text, motion visible, not black/logo/brokerage name
8. CTA (0-10): present but not aggressive, fits platform norms
9. Voice/brand (0-10): no logo/phone/agent in frame except end card, brand colors correct
10. Anti-slop (0-10): no AI filler, no generic real-estate adjectives, data cited

Auto-zero triggers (any = immediate 0 for that category):
- banned word in any text or VO
- unverified stat (no citation)
- logo/brokerage name outside designated zone
- fair-housing violation`;

const schema = {
  type: Type.OBJECT,
  properties: {
    scores: {
      type: Type.OBJECT,
      properties: {
        hook:        { type: Type.INTEGER },
        retention:   { type: Type.INTEGER },
        text:        { type: Type.INTEGER },
        audio:       { type: Type.INTEGER },
        format:      { type: Type.INTEGER },
        engagement:  { type: Type.INTEGER },
        cover:       { type: Type.INTEGER },
        cta:         { type: Type.INTEGER },
        brand:       { type: Type.INTEGER },
        antislop:    { type: Type.INTEGER },
      },
      required: ['hook','retention','text','audio','format','engagement','cover','cta','brand','antislop'],
    },
    total:        { type: Type.INTEGER },
    auto_zeros:   { type: Type.ARRAY, items: { type: Type.STRING } },
    ship_blocker: { type: Type.BOOLEAN },
    notes:        { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['scores', 'total', 'auto_zeros', 'ship_blocker', 'notes'],
};

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `Score this beat script:\n${beatScript}`,
  config: {
    systemInstruction: systemPrompt,
    temperature: 0.0,
    responseMimeType: 'application/json',
    responseSchema: schema,
  },
});

const scorecard = JSON.parse(response.text);
if (scorecard.ship_blocker || scorecard.total < 80) {
  console.error('FAIL — do not ship', scorecard);
}
```

**Estimated cost per call (with system prompt caching):** ~4K tokens system prompt (cached at $0.03/MTok after first write) + ~800 tokens beat script + ~300 tokens output ≈ $0.0001. 500 scoring calls/month = $0.05.

---

### 4. Synthesize 5 housing-news articles into a 100-word summary

```javascript
const articles = [
  { url: 'https://...', content: '...scraped text...' },
  // ... 4 more
];

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `Synthesize these 5 housing market articles into ONE 100-word summary paragraph. Focus on: what changed, what it means for Bend OR buyers and sellers, specific numbers only (no approximations). No fluff. No "the article states."\n\nArticles:\n${articles.map((a, i) => `[${i+1}] ${a.content}`).join('\n\n')}`,
  config: {
    temperature: 0.2,
    maxOutputTokens: 256,
  },
});

console.log(response.text);
```

**Note:** If you pass URLs instead of scraped text, enable grounding (`tools: [{ googleSearch: {} }]`) and Gemini will fetch and cite them. Cost: $35/1,000 grounded prompts beyond the 1,500 free/day tier.

---

### 5. Translate raw market stats to natural narrative paragraph

```javascript
// This is the cheapest, most reliable use case for Gemini vs Claude
const stats = {
  median_close_price: 475000,
  yoy_change_pct: -3.2,
  active_listings: 147,
  months_of_supply: 3.8,
  market_verdict: "seller's market",
  avg_dom: 22,
  city: "Bend",
  period: "Q1 2026",
};

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `Write a 60-word market summary paragraph from these verified stats. Use exact numbers. No approximations. No banned words (stunning, nestled, boasts, charming, breathtaking). End with one sentence on what buyers or sellers should do next.\n\nStats: ${JSON.stringify(stats)}`,
  config: {
    systemInstruction: 'You write market commentary for Ryan Realty, a Bend Oregon brokerage. Direct. Specific. No AI filler words.',
    temperature: 0.4,
    maxOutputTokens: 200,
  },
});

// Output feeds directly into video VO script or email newsletter
console.log(response.text);
```

---

## Common failure modes

### JSON output drift

**Symptom:** Model returns valid JSON but adds extra fields, nests incorrectly, or omits required fields despite `responseSchema`.

**Fix:** Use `required` array explicitly. Set `temperature: 0.0` for classification tasks. Add "Return ONLY the JSON object. No preamble, no explanation, no markdown code fences." to system prompt. If drift persists, switch to Gemini 2.5 Pro (better instruction-following on complex schemas).

### Safety filter false-positives

**Symptom:** Response blocked for content that clearly does not violate policy (e.g., "foreclosure rate" triggers harassment filter).

**Fix:** For Gemini 2.5 Flash, safety filters default to OFF — false-positives are rare. For Pro, add explicit `safetySettings` with `BLOCK_ONLY_HIGH` as a first step. `BLOCK_NONE` requires Google to whitelist the project (submit a request via Google Cloud console). Real-estate content does not need `BLOCK_NONE` in practice.

### Citation hallucination in grounded responses

**Symptom:** `groundingMetadata` returns source URLs that don't contain the quoted statistic.

**Fix:** Always parse `groundingChunks[].web.uri` and `groundingChunks[].web.snippet` from the response. Cross-check the snippet text against the claim before using any figure in a deliverable. Gemini grounding is not a substitute for the Supabase + Spark primary-source verification required by CLAUDE.md §0. Use grounding for news synthesis, not for MLS statistics.

### Context window cost surprises on Pro

**Symptom:** Bill spikes when passing full article text to Pro.

**Fix:** Use Flash for synthesis tasks. Pro's `>200K` tier costs $2.50/MTok in vs Flash's flat $0.30/MTok. Flash's 1M-token context window is sufficient for all content engine tasks at this volume.

### SDK deprecation confusion

**Symptom:** Code importing `@google-cloud/vertexai` throws deprecation warnings post-2025.

**Fix:** Migrate to `@google/genai`. The old package still works until 2026-06-24, but new code should use `@google/genai` with `{ vertexai: true, project: 'ryan-realty-tc', location: 'us-central1' }` in the constructor.

---

## Output format

All five use cases above return one of:
- **Parsed JSON object** — use `JSON.parse(response.text)` after `responseMimeType: 'application/json'`
- **Plain text** — use `response.text` directly (narrative paragraphs, summaries)
- **Grounded text with citations** — use `response.text` + `response.candidates[0].groundingMetadata`

Response shape:
```javascript
{
  text: string,                  // shortcut for first candidate's first text part
  candidates: [{
    content: { parts: [{ text }] },
    groundingMetadata: {
      webSearchQueries: string[],
      groundingChunks: [{ web: { uri, title, snippet } }],
    },
    finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY',
  }],
  usageMetadata: {
    promptTokenCount: number,
    candidatesTokenCount: number,
    totalTokenCount: number,
    cachedContentTokenCount: number,  // present when cache hit
  },
}
```

---

## Fallback (Claude API direct, OpenAI)

| Scenario | Fallback |
|---|---|
| Vertex AI quota exceeded or region outage | Claude Sonnet 4.6 via Anthropic API (`ANTHROPIC_API_KEY` in `.env.local`). Same prompt, swap client. Cost: 10× higher. |
| JSON schema too complex for Flash (drift) | Gemini 2.5 Pro (`gemini-2.5-pro`). Same SDK, same schema. Cost: 4× Flash. |
| Pro also drifts | Claude Sonnet 4.6 with Anthropic's native JSON tool-use (`type: 'json_object'`). Most reliable structured output available. |
| Grounding returns no relevant results | Fall back to manual article scrape → WebFetch → pass text directly. |
| `BLOCK_NONE` not approved and content blocked | Claude Haiku 4.5 ($1/MTok in, $5/MTok out) — no safety filter issues for real-estate content. |

**Environment variables in `.env.local` to add:**
```
GOOGLE_CLOUD_PROJECT=ryan-realty-tc
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-2.5-pro
```

ADC (Application Default Credentials) handles auth automatically when running on Cloud Run or locally after `gcloud auth application-default login`. No API key needed for Vertex AI.
