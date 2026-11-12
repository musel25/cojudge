## Steps

1. Use split() to get the words.
2. Take index 0 of each word and make it upper case.
3. Join the letters with no spaces.

## Edge case

A blank line has no words, so its acronym is empty.

## One correct answer

```python
text = input()
letters = []
for word in text.split():
    letters.append(word[0].upper())
print("".join(letters))
```

Inspired by [this public exercise](https://exercism.org/tracks/python/exercises/acronym). The task text and cases here are new.
