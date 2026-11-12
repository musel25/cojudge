## Steps

1. Start count at 0.
2. Visit each position in the first string.
3. Add 1 when the two characters at that position differ.

## Edge case

Two empty strings have 0 different positions.

## One correct answer

```python
first = input()
second = input()
count = 0
for index in range(len(first)):
    if first[index] != second[index]:
        count += 1
print(count)
```

Inspired by [this public exercise](https://exercism.org/tracks/python/exercises/hamming). The task text and cases here are new.
