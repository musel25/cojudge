## Steps

1. Start an empty scores dictionary.
2. Store each name with its integer score.
3. Use get(query, 0) to find a score or 0.

## Edge case

A count of 0 makes an empty dictionary. Every query then gives 0.

## One correct answer

```python
count = int(input())
scores = {}
for _ in range(count):
    parts = input().split()
    name = parts[0]
    score = int(parts[1])
    scores[name] = score
query = input()
print(scores.get(query, 0))
```

Inspired by [this public exercise](https://www.practicepython.org/exercises/). The task text and cases here are new.
