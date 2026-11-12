## Steps

1. Read the numbers into nums.
2. Build a new list with one square per number.
3. Show each square.

## Edge case

A negative number has a positive square. An empty input gives no numbers.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
squares = [number * number for number in nums]
for number in squares:
    print(number)
```
