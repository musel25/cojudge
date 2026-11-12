## Steps

1. Start with power = 1.
2. Keep doubling while power is below target.
3. Show the first power that reaches target.

## Edge case

For target = 1, the loop does not run. The answer is 1.

## One correct answer

```python
target = int(input())
power = 1
while power < target:
    power *= 2
print(power)
```
