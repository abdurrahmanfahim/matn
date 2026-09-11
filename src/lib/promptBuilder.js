// Builds a copy-ready prompt that instructs any AI chat tool to convert
// raw book text into وَرّاق's JSON schema.

const SCHEMA_BOOK = `{
  "title": "string, the book's title if present, else omit",
  "subtitle": "string, optional subtitle, else omit",
  "chapters": [
    {
      "title": "string, the chapter/section heading",
      "items": [
        { "type": "sub", "title": "string — a numbered sub-topic heading within this chapter" },
        { "type": "p", "text": "string — a normal paragraph of body text" },
        { "type": "verse", "lines": ["string", "string"] }
      ]
    }
  ]
}`;

const SCHEMA_CHAPTERS = `[
  {
    "title": "string, the chapter/section heading",
    "items": [
      { "type": "sub", "title": "string — a numbered sub-topic heading within this chapter" },
      { "type": "p", "text": "string — a normal paragraph of body text" },
      { "type": "verse", "lines": ["string", "string"] }
    ]
  }
]`;

const RULES = `Rules:
- Preserve the original text exactly as written — do not translate, summarize, paraphrase, or fix spelling/diacritics.
- Identify natural chapter/major-section breaks and use them as chapters.
- Identify sub-topics within a chapter (smaller headings, numbered items, distinct sub-arguments) and use "type": "sub" for their heading only — the paragraphs that follow stay as normal "p" items right after it in the same items array.
- Identify poetry, verse, or any rhythmic/parallel-structured lines (e.g. lines separated by "..." or clearly metrical) and group them as a single "verse" item, with each line as a separate string in "lines", in original order.
- Every other line of text becomes a "p" item.
- If a paragraph defines a term as "Term: definition", keep the colon structure as-is in the "text" field — do not alter it.
- Output must be valid JSON only. No markdown code fences, no explanation, no trailing commentary — raw JSON starting with { or [ and nothing else.`;

export function buildPrompt(mode) {
  if (mode === 'chapter') {
    return `You are a book-structuring assistant. I'm adding one or more chapters to an existing book. Convert the raw text I provide below into a JSON ARRAY of chapter objects matching exactly this schema:

${SCHEMA_CHAPTERS}

${RULES}

Text to convert (paste below this line):
`;
  }
  return `You are a book-structuring assistant. Convert the raw book text I provide below into a single JSON object matching exactly this schema:

${SCHEMA_BOOK}

${RULES}

Book text to convert (paste below this line):
`;
}
