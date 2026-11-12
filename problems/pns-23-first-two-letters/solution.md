## Steps

1. Read the text.
2. Use [:2] to take its first two characters.
3. Show that slice.

## Edge case

A short or empty string does not cause an index error with a slice.

## One correct answer

```python
text = input()
print(text[:2])
```

Inspired by [this public exercise](https://codingbat.com/python/String-1). The task text and cases here are new.
