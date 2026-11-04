Select retrieved chunks for a prompt without exceeding a token budget.

Implement `solve(data)`.

- Input fields: `chunks` (`id`, `text`, `tokens`) and `budget`.
- Each ID identifies one source chunk. Only its first occurrence can be selected. Mark an ID as seen before checking its token cost, even if that occurrence does not fit.
- Chunks already appear in relevance order. Process them in this order.
- Add a chunk if its token count fits in the remaining budget.
- Skip a chunk that does not fit. Continue checking later chunks.
- Use the supplied token counts. Do not estimate or tokenize the text.
- Join selected text with `"\n\n"`. The separator adds no token cost in this exercise.
- Preserve text exactly, including empty text.
- Return `{"ids": [...], "context": "...", "used_tokens": 0}`.
- With no selected chunks, return empty IDs, empty context, and 0 tokens.

**Constraints:** At most 100 chunks. IDs are strings and can repeat. `1 <= tokens <= 10,000`. `0 <= budget <= 100,000`. Each text has at most 10,000 characters.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
