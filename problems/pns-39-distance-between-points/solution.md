## Steps

1. Read two points.
2. Unpack each pair into x and y.
3. Add the absolute x difference and absolute y difference.

## Edge case

Two equal points have distance 0. Coordinates may be negative.

## One correct answer

```python
parts = input().split()
first = (int(parts[0]), int(parts[1]))
parts = input().split()
second = (int(parts[0]), int(parts[1]))
x1, y1 = first
x2, y2 = second
print(abs(x1 - x2) + abs(y1 - y2))
```
