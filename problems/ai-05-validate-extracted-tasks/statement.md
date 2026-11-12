Validate task records from a model response before saving them.

Implement `solve(data)`.

- Input: `{"tasks": [...]}`. Each item can be any JSON value.
- A valid task is an object with exactly `title`, `priority`, and `due_date`.
- `title` must be a string. Trim whitespace from both ends. The result must not be empty. Preserve whitespace inside it.
- Whitespace means space, tab, newline, carriage return, form feed, or vertical tab.
- `priority` must be exactly `low`, `medium`, or `high`.
- `due_date` must be a string with a real calendar date in exact `YYYY-MM-DD` format. Years range from 0001 through 9999. Do not trim it.
- Return `{"tasks": [...], "errors": [{"index": 0, "errors": ["title"]}]}`.
- Keep valid tasks in input order with trimmed titles. Keep duplicates.
- For a non-object item, report only `record`.
- For an object, report every applicable error in this order: `fields` for extra keys, then `title`, `priority`, and `due_date` for missing or invalid fields.
- Error indices are zero-based input positions. Return error entries in input order. Do not include valid items in `errors`.

**Constraints:** At most 100 items. Each string has at most 1,000 characters. Strings contain no control characters except the six whitespace characters above. Use the Gregorian calendar, including its leap-year rules.

The JSON adapter is supplied. Implement `solve(data)` and return a dictionary.
