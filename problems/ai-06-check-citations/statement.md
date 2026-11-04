Check that each answer cites IDs from the supplied source list.

Implement `solve(data)`.

- Input fields: `source_ids` and `answers` (`text`, `citations`).
- An answer is valid if its citations list is nonempty and every cited ID occurs in `source_ids`.
- Compare IDs exactly. Do not trim or change case.
- Repeated citations are allowed.
- Return `{"valid": [...], "invalid": [...]}` with zero-based answer indices in input order.
- With no answers, return two empty lists.

Check reference IDs only. Ignore answer text. This check does not establish factual truth or whether a source supports a claim.

**Constraints:** At most 100 unique source IDs and 100 answers. Each answer has at most 100 citations. IDs are nonempty ASCII strings. Answer text is a string. All records have the stated fields and types.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
