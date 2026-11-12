Simulate an embedding cache so repeated requests reuse earlier results.

Implement `solve(data)`.

- Input fields: `cache` and `requests`, both lists.
- Each cache entry has `model`, `text`, and `embedding`.
- Each request has `model`, `text`, and `fresh_embedding`.
- The cache key is the exact pair `(model, text)`. Do not trim or change either string.
- On a hit, return the stored embedding. Ignore `fresh_embedding`.
- On a miss, use `fresh_embedding` as the simulated API result. Add one cache entry and count one API call.
- Later requests in the same batch can use the new cache entry.
- Return `{"embeddings": [...], "cache": [...], "calls": 0}`.
- Keep embeddings in request order. Keep initial cache order, then append misses in first-use order.

This is an offline simulation. No API calls are needed. The supplied fresh values let tests detect accidental calls on cache hits.

**Constraints:** At most 100 cache entries and 100 requests. Initial cache keys are unique. Model and text are strings of at most 1,000 characters, including empty strings. An embedding is a list of at most 32 integers from -100 through 100. Preserve vectors exactly.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
