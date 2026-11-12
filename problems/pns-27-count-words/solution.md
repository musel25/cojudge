## Steps

1. Use split() to make a list of words.
2. Use len() to count the list items.
3. Show the count.

## Edge case

An empty line or a line with only spaces has 0 words.

## One correct answer

```python
text = input()
words = text.split()
print(len(words))
```
