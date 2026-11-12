## Steps

1. Check that value is at least low.
2. Check that value is at most high.
3. Return 1 only when both checks are true.

## Edge case

A value equal to low or high is inside the range.

## One correct answer

```python
def inside(value, low, high):
    if low <= value and value <= high:
        return 1
    return 0

value = int(input())
low = int(input())
high = int(input())
print(inside(value, low, high))
```
