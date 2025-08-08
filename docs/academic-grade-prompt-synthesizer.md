# Academic-Grade Prompt Synthesizer Implementation

## Overview
The Academic-Grade Prompt Synthesizer is a meta-prompting system that transforms user requests into structured execution plans with controllable parameters ("dials").

## Architecture

### 1. Kernel Prompt (`/lib/orchestrator/prompts/kernel.ts`)
- Contains the full Academic-Grade Prompt Synthesizer instructions
- Includes detailed JSON schema with all required fields
- Has explicit example response for "tell me a joke"
- Emphasizes JSON-only output (no markdown, no explanations)

### 2. Response Validation (`/lib/orchestrator/response-validator.ts`)
- **ResponseValidator class** with three layers of robustness:
  1. Direct JSON parsing
  2. JSON extraction from text (handles markdown blocks)
  3. Fallback response generation
- Schema validation checks all required fields
- Auto-fix attempts to repair incomplete responses

### 3. API Route (`/api/orchestrator/plan/route.ts`)
- Uses Anthropic Claude 3.5 Sonnet model
- Comprehensive logging for debugging
- Validation and fallback handling
- Returns enriched response with metadata

## Key Features

### Prompt Dials
Control parameters that adjust the AI's behavior:
- **preset**: Quick configurations (laser, scholar, builder, etc.)
- **depth**: Analysis depth (0-5)
- **breadth**: Alternative exploration (0-5)
- **verbosity**: Output detail level (0-5)
- **creativity**: Novelty in approach (0-5)
- **risk_tolerance**: Boldness in assumptions (0-5)
- **evidence_strictness**: Verification requirements (0-5)
- **browse_aggressiveness**: Web search tendency (0-5)

### Response Structure
```json
{
  "ok": boolean,
  "dials": { /* control parameters */ },
  "state": {
    "userGoal": string,
    "certainty": number,
    "plan": [/* execution steps */],
    "cursor": number,
    "completedSteps": [],
    "context": {}
  },
  "prompt_blueprint": {
    "purpose": string,
    "instructions": [],
    "reference": [],
    "output": {}
  },
  "events": [/* processing events */],
  "next_action": "execute|done|safe_refuse|clarify",
  "final_answer": string,
  "confidence": number,
  "schema_version": "1.0"
}
```

## Testing Tools

### 1. Minimal JSON Test (`/test-json`)
- Tests if Claude can output pure JSON
- Simple prompt with clear instructions
- Visual feedback on success/failure

### 2. Full Orchestrator Test (`/test`)
- Toggle between direct API and orchestrator
- Shows full response structure
- Displays execution plan and events

### 3. Automated Test Suite (`/scripts/test-orchestrator-levels.ts`)
- Tests various complexity levels
- Validates response structure
- Measures success rate

## Usage

### Basic Request
```javascript
const response = await fetch('/api/orchestrator/plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userGoal: 'tell me a joke',
    state: {}
  })
});
```

### With Custom Dials
```javascript
const response = await fetch('/api/orchestrator/plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userGoal: 'research AI news',
    state: {
      dials: {
        preset: 'scholar',
        depth: 5,
        evidence_strictness: 5
      }
    }
  })
});
```

## Troubleshooting

### Issue: Claude returns plain text instead of JSON
**Solution**: The system now has three layers of handling:
1. Tries direct JSON parse
2. Extracts JSON from markdown/text
3. Creates fallback response with the text as final_answer

### Issue: Missing required fields
**Solution**: ResponseValidator.attemptAutoFix() fills in missing fields with sensible defaults

### Issue: Complex requests not properly analyzed
**Solution**: The example in the kernel prompt shows proper structure. Claude should follow this pattern.

## Configuration Requirements

### Environment Variables
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Model
Currently using: `claude-3-5-sonnet-20241022`

## Future Improvements

1. **Prompt Chaining**: First get the plan, then execute steps
2. **Streaming Responses**: Stream JSON as it's generated
3. **Custom Presets**: User-defined dial configurations
4. **Response Caching**: Cache similar requests
5. **Multi-Model Support**: Use different models for different tasks

## Debug Logs

When testing, check the server console for:
- `=== ORCHESTRATOR DEBUG ===`: Input details
- `=== LLM RESPONSE ===`: Raw response from Claude
- `=== DIRECT JSON PARSE ===`: Parsing attempts
- `=== SCHEMA VALIDATION ===`: Field validation
- Final response structure confirmation