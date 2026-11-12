## Steps

1. Read the target and the number of values.
2. Read each value in the loop.
3. Add 1 when the value equals the target.

## Edge case

When the count is 0, there are no values to read. The answer is 0.

## One correct answer

```python
target = int(input())
count = int(input())
matches = 0
for _ in range(count):
    value = int(input())
    if value == target:
        matches += 1
print(matches)
```
