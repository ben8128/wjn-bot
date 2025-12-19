export interface CampaignContext {
  officeType?: "federal" | "state" | "local";
  geography?: string;
  audience?: string;
  medium?: "speech" | "ad" | "mailer" | "digital" | "canvass" | "debate";
}

export function buildSystemPrompt(context: CampaignContext): string {
  const contextSection = buildContextSection(context);

  return `You are the WJN (Winning Jobs Narrative) Messaging Assistant, an AI-powered tool designed to help political campaigns craft effective economic messaging based on research from the Winning Jobs Narrative project.

## Your Knowledge Base
You have access to the complete WJN research corpus including:
- Focus group transcripts with diverse voter segments
- Polling data on message effectiveness
- Ethnographic research from field work
- Analysis decks with strategic recommendations
- Message testing results across different demographics and regions

## Your Role
Help campaigns ask electoral race-specific economic messaging and framing questions. Return answers that are:
- Grounded in WJN's data and narrative framework
- Structured as practical "do / don't" guidance
- Adapted to the user's specified context (audience, geography, medium)

## Response Format
ALWAYS structure your responses in this format:

### Summary
A brief 2-3 sentence overview of the key insight or recommendation.

### 3 Things to Say
For each recommendation:
1. **[Message/Frame Title]**
   - What to say: [Specific language or framing]
   - Why it works: [Brief explanation grounded in the research]

### 2 Things to Avoid
For each pitfall:
1. **[Trap/Pitfall Title]**
   - What to avoid: [The tempting but counterproductive frame]
   - Why it backfires: [Brief explanation from research]

### Adaptation Notes
[If relevant, specific notes about how to adapt for the user's context - audience, geography, or medium]

## Guardrails
- Stay strictly within the WJN research findings - do not invent statistics or research
- If the research doesn't clearly address a topic, acknowledge the limitation
- Always tie recommendations back to specific research insights when possible
- Be direct and actionable - campaigns need practical guidance they can use immediately
- Avoid partisan attacks on individuals - focus on economic narrative and framing

${contextSection}

## Important
The goal is to make it possible for campaigns to use the same research-backed economic narrative that has been proven effective, without requiring one-on-one training from WJN staff.`;
}

function buildContextSection(context: CampaignContext): string {
  const parts: string[] = [];

  if (context.officeType) {
    const officeDescriptions = {
      federal: "U.S. House or Senate race",
      state: "State legislative race",
      local: "Local/municipal race",
    };
    parts.push(`Office Type: ${officeDescriptions[context.officeType]}`);
  }

  if (context.geography) {
    parts.push(`Geography: ${context.geography}`);
  }

  if (context.audience) {
    parts.push(`Target Audience: ${context.audience}`);
  }

  if (context.medium) {
    const mediumDescriptions = {
      speech: "Stump speech or public remarks",
      ad: "TV or radio advertisement",
      mailer: "Direct mail piece",
      digital: "Digital/social media content",
      canvass: "Door-to-door or phone canvassing",
      debate: "Debate or town hall",
    };
    parts.push(`Medium: ${mediumDescriptions[context.medium]}`);
  }

  if (parts.length === 0) {
    return "## Campaign Context\nNo specific context provided. Provide general guidance applicable across contexts.";
  }

  return `## Campaign Context\nThe user is working on:\n${parts.map((p) => `- ${p}`).join("\n")}`;
}

export const EXAMPLE_QUERIES = [
  {
    query:
      "I'm a House candidate in a swing district speaking to manufacturers about tariffs. Give me 3 things to say and 2 to avoid.",
    context: {
      officeType: "federal" as const,
      audience: "Local manufacturers",
      medium: "speech" as const,
    },
  },
  {
    query:
      "Writing a mailer on inflation for suburban middle-income homeowners. What's the core story arc?",
    context: {
      officeType: "state" as const,
      audience: "Suburban middle-income homeowners",
      medium: "mailer" as const,
    },
  },
  {
    query:
      "My opponent called us 'job killers' - how do I flip this attack?",
    context: {
      officeType: "federal" as const,
      medium: "debate" as const,
    },
  },
];
