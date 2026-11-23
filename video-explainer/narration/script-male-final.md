# PCP: Final Male Narration Script

Approved original male voice. Five-minute timeline with visual reading pauses.

## 00:01 to 00:10

Before you send a prompt, check what it leaves unsaid. Missing context. Unclear constraints. No definition of done.

## 00:12.5 to 00:17.5

Make it better. Better how? What must stay the same?

## 00:21 to 00:29

Prompt Control Plane helps you catch those gaps before a model starts working. Clearer requests. Repeatable checks.

## 00:31 to 00:42

Prompt Control Plane, or P C P, is a deterministic prompt governance engine. It checks requests before they reach a language model.

## 00:45 to 01:00

Scoring, routing, and analysis run locally, with zero model calls inside the engine. Use the terminal commands, or connect its tools to a compatible assistant. Each surface shares the same underlying rules.

## 01:03 to 01:28

The workflow starts with your prompt. P C P scores its structure, classifies the task, and returns a recommendation with issues you can inspect. Add the missing context and constraints before you proceed. The same input, rules, and configuration produce the same result. You still review the model's answer.

## 01:31 to 01:37

Two commands make a useful starting point: preflight and optimize.

## 01:39 to 02:00

Preflight classifies the task, assesses prompt risk, recommends a model, and scores the request in one call. Read the result before you send the prompt. Routing uses deterministic rules, while cost estimates help compare options. Actual cost depends on your workload and usage.

## 02:08 to 02:28

Optimize prepares a structured request. Here, an authentication bug becomes an explicit goal with constraints: find the root cause, preserve compatibility, and add a regression test. The input gets a quality score. The output gets a structural checklist. Review the changes before approving them.

## 02:31 to 02:37

Bring the same checks into the workflow your team already uses.

## 02:39 to 03:00

The GitHub Action checks prompt files during a pull request. Configure a threshold and publish feedback alongside the code review. A developer can read the issues, fill the gaps, and run the check again. That gives maintained prompts a repeatable review step before they ship.

## 03:04 to 03:28

For an application, use the lightweight validate API. Pass in the prompt and your quality threshold, then inspect the result. Your application decides how to handle a failed check. You can return feedback for revision or block the next step. The API uses the same deterministic scoring engine as the command line.

## 03:31 to 03:37

Choose the integration that fits where your team works.

## 03:39 to 03:51.5

With an MCP client, add the P C P server to your configuration. Compatible assistants can then use its analysis, compilation, and governance tools.

## 03:55 to 04:09

In the terminal, install the package and start with preflight. Check a request, inspect the feedback, and refine it. Supported hooks can bring prompt checks into your editing workflow.

## 04:13 to 04:28

Use the programmatic API when the check belongs inside your application. Import the function, pass in a request, and inspect the result. Your code decides what happens next. Bring consistent prompt checks into your existing application.

## 04:31.5 to 04:39.5

Zero model calls inside the engine. Terminal commands and assistant integrations. Repeatable checks before generation.

## 04:43 to 04:58

Start with a prompt your team uses every day. Run preflight. Read the feedback. Fill the gaps. Prompt Control Plane. Governance before generation. Get P C P dot site.
