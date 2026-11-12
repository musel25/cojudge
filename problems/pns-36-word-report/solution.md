## Steps

1. Use split() to get the words.
2. Use len() and set() for the first two values.
3. Visit the words to find the greatest length.

## Edge case

An empty line has no words. The longest length stays 0.

## One correct answer

```python
text = input()
words = text.split()
longest = 0
for word in words:
    if len(word) > longest:
        longest = len(word)
print(len(words), len(set(words)), longest)
```
