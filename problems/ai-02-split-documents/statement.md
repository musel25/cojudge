Split documents into overlapping word chunks for retrieval.

Implement `solve(data)`.

- Input fields: `documents` (`id`, `text`), `chunk_size`, and `overlap`.
- A word is a run of non-whitespace characters. Use the same six whitespace characters as in Clean Documents.
- Start each document at word 0. Take at most `chunk_size` words.
- Join each chunk with one space. Advance by `chunk_size - overlap` words.
- Stop after a chunk reaches the last word. Do not add a chunk that contains only a repeated suffix.
- Empty or blank documents produce no chunks.
- Return `{"chunks": [{"id": "a:0", "document_id": "a", "text": "..."}]}`.
- Use document order, then chunk order. Chunk numbers start at 0 for each document.

**Constraints:** At most 100 documents, each with at most 1,000 words. IDs are unique ASCII strings without `:`. `1 <= chunk_size <= 100`. `0 <= overlap < chunk_size`. Text has no other control characters.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
