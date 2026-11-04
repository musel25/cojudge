Rank document embeddings by cosine similarity to a query embedding.

Implement `solve(data)`.

- Input fields: `query` (a vector), `documents` (`id`, `vector`), and `k`.
- Cosine similarity is `dot(query, vector) / (length(query) * length(vector))`.
- The dot product is the sum of component products. Vector length is the square root of the sum of squared components.
- A zero query or zero document vector has similarity 0.
- Round each score to 12 decimal places before sorting. Use Python's `round(score, 12)`.
- Sort by rounded score, highest first. Break equal rounded scores by ID in ascending ASCII order.
- Keep negative scores. Return at most `k` IDs as `{"ids": [...]}`.
- Return an empty list when `k` is 0 or there are no documents.

The supplied vectors stand in for embeddings. Do not call an embedding API.

**Constraints:** At most 100 documents. IDs are unique ASCII strings. All vectors have the same dimension, from 1 through 32. Components are integers from -100 through 100. `0 <= k <= 100`.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
