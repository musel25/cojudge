## Steps

1. Start total at 0.
2. Read one number.
3. Add it only if it is not 0, then read again.

## Edge case

If the first number is 0, the loop does not add anything.

## One correct answer

```python
total = 0
value = int(input())
while value != 0:
    total += value
    value = int(input())
print(total)
```
