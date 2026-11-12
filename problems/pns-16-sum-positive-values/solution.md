## Steps

1. Start total at 0.
2. Visit every item in nums.
3. Add an item only when it is greater than 0.

## Edge case

A blank list and a list without positive values both give 0.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
total = 0
for number in nums:
    if number > 0:
        total += number
print(total)
```
