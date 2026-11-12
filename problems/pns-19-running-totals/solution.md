## Steps

1. Start total at 0 and totals as an empty list.
2. Add each number to total.
3. Append the new total to totals.

## Edge case

A blank input has no numbers. The answer list stays empty.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
totals = []
total = 0
for number in nums:
    total += number
    totals.append(total)
for number in totals:
    print(number)
```

Inspired by [this public exercise](https://exercism.org/tracks/python/exercises/accumulate). The task text and cases here are new.
