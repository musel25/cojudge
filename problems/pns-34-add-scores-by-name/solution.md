## Steps

1. Start an empty totals dictionary.
2. For each line, add the new score to the old total for that name.
3. Show the total for the query.

## Edge case

If a name does not appear, its total is 0. Scores can be negative.

## One correct answer

```python
count = int(input())
totals = {}
for _ in range(count):
    parts = input().split()
    name = parts[0]
    score = int(parts[1])
    totals[name] = totals.get(name, 0) + score
query = input()
print(totals.get(query, 0))
```
