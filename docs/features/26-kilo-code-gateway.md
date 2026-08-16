# 26 — Kilo Code Gateway

**NEW document** — LLM gateway client, architecture analysis + generation, JSON repair, prompt engineering

---

## Feature Summary

The Kilo Code Gateway is Zync's LLM API client for AI-powered architecture analysis and generation. It sends repo context or project descriptions to an OpenAI-compatible chat completions endpoint and parses the structured JSON response. Includes robust JSON repair for common model output issues (markdown blocks, smart quotes, trailing commas).

---

## Architecture Diagram

```
┌─────────────────── BACKEND ─────────────────────────────┐
│                                                         │
│  backend/services/kiloCodeGateway.js (219 lines)        │
│                                                         │
│  Two AI functions:                                      │
│                                                         │
│  1. analyzeArchitectureWithKilo({ repoContext,          │
│       projectName, model? })                            │
│     ├─ Prompt: "Senior Software Architect" analyzing    │
│     │  existing codebase context                        │
│     ├─ Input: file tree + interesting file contents     │
│     └─ Output: structured JSON architecture analysis    │
│                                                         │
│  2. generateArchitectureWithKilo({ projectName,         │
│       projectDescription, model? })                     │
│     ├─ Prompt: "Expert AI Software Architect Agent"     │
│     │  designing new project architecture               │
│     ├─ Input: project name + description                │
│     └─ Output: structured JSON architecture blueprint   │
│                                                         │
│  Shared:                                                │
│  ├─ parseModelJson(text) — JSON repair + parse          │
│  ├─ POST /v1/chat/completions (OpenAI-compatible)       │
│  ├─ Temperature: 0.2 (deterministic)                    │
│  └─ Timeout: 120s (long generation)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/services/kiloCodeGateway.js` (219 lines)

### Configuration (lines 11-13)
```js
const KILO_CODE_GATEWAY_URL = process.env.KILO_CODE_GATEWAY_URL || '';
const KILO_CODE_GATEWAY_API_KEY = process.env.KILO_CODE_GATEWAY_API_KEY || '';
const KILO_CODE_GATEWAY_MODEL = process.env.KILO_CODE_GATEWAY_MODEL || 'kilo-auto/free';
```

### parseModelJson (lines 20-66)
Robust JSON parser that handles common LLM output issues:

1. **Strip markdown code blocks:** Remove ` ```json ` and ` ``` ` wrappers
2. **Fix trailing commas:** Remove `,}` → `}` and `,]` → `]`
3. **Normalize quotes:** Smart quotes (`""`, `''`) → straight quotes
4. **Single to double quotes:** `'value'` → `"value"`
5. **Remove stray quotes:** `JWT"s` → `JWTs` (quotes between word chars)
6. **Parse:** `JSON.parse(jsonString)`
7. **Fallback:** If parse fails, extract JSON via regex `\{[\s\S]*\}`
8. **Validate:** Must be an object

```js
const parseModelJson = (text, errorTag = 'response') => {
  let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
  jsonString = jsonString
    .replace(/,\s*}/g, '}')           // trailing commas in objects
    .replace(/,\s*]/g, ']')           // trailing commas in arrays
    .replace(/['']/g, "'")            // smart single quotes
    .replace(/[""]/g, '"')            // smart double quotes
    .replace(/'/g, '"')               // single to double quotes
    .replace(/(\w)"(\w)/g, '$1$2')    // stray quotes between words
    .trim();
  
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Failed to parse architecture generation ${errorTag}`);
    }
  }
  return parsed;
};
```

### analyzeArchitectureWithKilo (lines 68-139)
- **Input:** `{ repoContext, projectName, model? }`
- **Prompt:** Senior Software Architect analyzing existing codebase
- **System message:** `"You are a helpful assistant that returns only valid JSON."`
- **Temperature:** 0.2 (deterministic, low creativity)
- **Timeout:** 120 seconds
- **API call:**
  ```js
  const response = await axios.post(
    `${KILO_CODE_GATEWAY_URL}/v1/chat/completions`,
    {
      model: selectedModel,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that returns only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    },
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KILO_CODE_GATEWAY_API_KEY}` }, timeout: 120000 }
  );
  ```
- **Response parsing:** `parseModelJson(response.data?.choices?.[0]?.message?.content || '')`

### Prompt Schema (Analysis)
The prompt requests a strict JSON schema:
```
{
  "highLevel": "Brief summary",
  "frontend": { "structure", "pages", "components", "routing" },
  "backend": { "structure", "apis", "controllers", "services", "authFlow" },
  "database": { "design", "collections", "relationships" },
  "apiFlow": "How frontend communicates with backend",
  "integrations": ["React", "Express", "MongoDB", ...]
}
```

### generateArchitectureWithKilo (lines 141-219)
- **Input:** `{ projectName, projectDescription, model? }`
- **Prompt:** Expert AI Software Architect Agent designing new architecture
- **Same API call pattern** as analysis
- **Output:** Architecture blueprint with same schema + additional fields:
  - `highLevel`: Detailed explanation with design patterns
  - `frontend.pages`: Critical pages/screens required
  - `backend.apis`: Key REST API endpoints
  - `database.collections`: Collections/tables needed

### Prompt Rules for Integrations
The prompt includes strict rules to prevent noisy output:
- Only simple canonical technology names (e.g., "React", not "React (for UI)")
- No descriptions, explanations, or parenthetical notes
- No UI features or page names in the integrations array
- Use "N/A" if a detail cannot be derived

---

## API Compatibility

The gateway uses an **OpenAI-compatible chat completions** endpoint:
```
POST {KILO_CODE_GATEWAY_URL}/v1/chat/completions
Content-Type: application/json
Authorization: Bearer {KILO_CODE_GATEWAY_API_KEY}

{
  "model": "kilo-auto/free",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.2
}
```

Response format:
```json
{
  "choices": [
    {
      "message": {
        "content": "{ ... JSON string ... }"
      }
    }
  ]
}
```

---

## Error Paths

| Scenario | Handling |
|---|---|
| Gateway URL or API key missing | `throw new Error('Kilo Code Gateway is not configured...')` |
| API timeout (120s) | Axios timeout error → caught by caller → quota refunded |
| Invalid JSON response | `parseModelJson` attempts repair, then regex extraction, then throws |
| Network error | Axios error → caught by caller → quota refunded |
| Empty response | `text = ''` → parseModelJson throws |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `KILO_CODE_GATEWAY_URL` | Yes | — | Gateway API base URL |
| `KILO_CODE_GATEWAY_API_KEY` | Yes | — | API key |
| `KILO_CODE_GATEWAY_MODEL` | No | `kilo-auto/free` | Model identifier |

---

## Cross-References

- [25-ai-architecture-analysis.md](./25-ai-architecture-analysis.md) — Endpoint that calls this service
- [27-usage-service-quota.md](./27-usage-service-quota.md) — Quota management for gateway calls
- [14-project-crud.md](./14-project-crud.md) — Project route that triggers analysis
