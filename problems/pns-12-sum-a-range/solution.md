## Steps

1. Start total at 0.
2. Loop from start through end.
3. Return total after the loop ends.

## Edge case

When start equals end, the answer is that one number.

## One correct answer

```python
def sum_range(start, end):
    total = 0
    for number in range(start, end + 1):
        total += number
    return total

start = int(input())
end = int(input())
print(sum_range(start, end))
```
