## Steps

1. Start an empty dictionary.
2. Visit each word and add 1 to its count.
3. Read the target count. Use 0 if the key is absent.

## Edge case

An empty first line has no words, so every target has count 0.

## One correct answer

```python
text = input()
target = input()
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
print(counts.get(target, 0))
```

Inspired by [this public exercise](https://exercism.org/tracks/python/exercises/word-count). The task text and cases here are new.
