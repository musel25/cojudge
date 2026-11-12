Clean documents before they enter a search index.

Implement `solve(data)`.

- Input: `{"documents": [{"id": "a", "text": "  Hello\tworld "}]}`.
- Replace each run of whitespace with one space. Remove whitespace at both ends.
- Whitespace means space, tab, newline, carriage return, form feed, or vertical tab.
- Remove documents with empty cleaned text.
- Remove duplicate cleaned text. Keep the first document and its ID.
- Compare text exactly. Case and punctuation matter.
- Return `{"documents": [...]}` with cleaned text, in input order.

**Constraints:** At most 100 documents. IDs are unique ASCII strings. Each text has at most 10,000 characters. Text can contain Unicode letters. It has no control characters except the six whitespace characters above.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
