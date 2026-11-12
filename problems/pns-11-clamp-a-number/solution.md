## Steps

1. Check whether value is below low.
2. Check whether value is above high.
3. Return value when it is already inside the limits.

## Edge case

A value on a limit stays the same. A range with low = high always returns that one value.

## One correct answer

```python
def clamp(value, low, high):
    if value < low:
        return low
    if value > high:
        return high
    return value

value = int(input())
low = int(input())
high = int(input())
print(clamp(value, low, high))
```
