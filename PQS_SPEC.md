# PQS — Prompt Quality Score Specification

**Version:** 1.0.0
**Status:** Stable
**Engine:** pcp-engine v5.2.0+

## Overview

PQS (Prompt Quality Score) is a deterministic metric for evaluating the structural quality of AI prompts. It measures how well a prompt communicates intent, provides specificity, defines success criteria, sets constraints, and uses tokens efficiently.

PQS requires zero LLM calls. All scoring is rule-based and deterministic — the same prompt always produces the same score.

## Score Range

| Range | Label | Meaning |
|-------|-------|---------|
| 0–39 | Poor | Prompt lacks structure, specificity, or clear intent |
| 40–59 | Fair | Prompt has some structure but missing key elements |
| 60–79 | Good | Prompt is reasonably well-specified |
| 80–100 | Excellent | Prompt is well-structured with clear constraints |

## Dimensions

PQS is composed of 5 weighted dimensions, each scored 0–20:

### 1. Clarity (0–20)
Does the prompt clearly state what it wants?
- Penalizes vague terms ("make it better", "fix stuff")
- Rewards specific, actionable language
- Adjusts for prompt length (very short prompts may lose points)

### 2. Specificity (0–20)
Does the prompt provide concrete details?
- **Code tasks:** rewards file paths, function names, code references
- **Writing tasks:** rewards audience, tone, platform, length constraints
- **Research tasks:** rewards comparison criteria, scope boundaries

### 3. Completeness (0–20)
Does the prompt define success?
- Rewards explicit success criteria
- Rewards defined output format
- Penalizes missing context that the LLM would need to guess

### 4. Constraints (0–20)
Does the prompt set boundaries?
- Rewards explicit "do not" constraints
- Rewards safety boundaries (especially in high-risk domains like auth, payments)
- Penalizes unbounded scope

### 5. Efficiency (0–20)
Is the prompt concise for what it communicates?
- Rewards high information density
- Penalizes excessive verbosity or redundancy
- Measured relative to token count

## Confidence Level

Every PQS score includes a confidence indicator:

| Confidence | Condition | Meaning |
|-----------|-----------|---------|
| `high` | PQS < 50 | Significant improvement expected from optimization |
| `medium` | PQS 50–79 | Moderate improvement expected |
| `low` | PQS >= 80 | Prompt is already strong — optimization adds scaffolding |

Confidence indicates expected improvement magnitude, NOT score reliability.

## Task-Type Adaptation

Scoring adapts to detected task type:
- **Code tasks** (`code_change`, `debug`, `refactor`, `create`): Specificity rewards file paths, function names
- **Writing tasks** (`writing`, `communication`): Specificity rewards audience, tone, platform
- **Research/Analysis** (`research`, `analysis`): Specificity rewards comparison criteria
- **Planning** (`planning`): Specificity rewards timeline, resource constraints

## Determinism Guarantee

PQS is fully deterministic:
- Same prompt → same score (always)
- No LLM calls, no network requests, no randomness
- Scoring logic is open source and auditable

## Usage

```bash
# CLI
pcp score "your prompt here"

# Programmatic
import { analyzePrompt, scorePrompt } from 'pcp-engine';
const spec = analyzePrompt(prompt);
const score = scorePrompt(spec);
// score.total, score.confidence, score.dimensions
```

## Badge

Display PQS in your repository:

```markdown
![PQS](https://img.shields.io/badge/PQS-82-brightgreen)
```

Generate dynamically:
```bash
pcp badge "your prompt"
```

## Versioning

This spec follows semver:
- **Patch** (1.0.x): Scoring bug fixes (scores may change slightly)
- **Minor** (1.x.0): New dimensions or rules added (scores may increase)
- **Major** (x.0.0): Breaking scoring changes (scores will change significantly)

## Reference Implementation

The reference implementation is [pcp-engine](https://github.com/rishi-banerjee1/prompt-control-plane) (npm: `pcp-engine`).
