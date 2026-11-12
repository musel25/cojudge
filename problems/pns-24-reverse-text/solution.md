## Steps

1. Read the text.
2. Use [::-1] to make a reversed copy.
3. Show the copy.

## Edge case

An empty line stays empty. Spaces also move when the text reverses.

## One correct answer

```python
text = input()
print(text[::-1])
```

Inspired by [this public exercise](https://exercism.org/tracks/python/exercises/reverse-string). The task text and cases here are new.
