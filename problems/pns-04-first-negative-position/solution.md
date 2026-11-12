## Steps

1. Start with -1 to mean no match.
2. Read the numbers in order.
3. Save the first negative position and stop the loop.

## Edge case

An empty input list has no negative number, so the answer stays -1.

## One correct answer

```python
count = int(input())
position_found = -1
for position in range(count):
    value = int(input())
    if value < 0:
        position_found = position
        break
print(position_found)
```
