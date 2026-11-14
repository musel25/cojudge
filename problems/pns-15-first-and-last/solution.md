## Steps

1. Read one line and change its parts into integers.
2. Use position 0 for the first value.
3. Use position -1 for the last value and print both.

## Edge case

A one-item list has the same first and last value.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
print(nums[0], nums[-1])
```

Inspired by [this public exercise](https://www.practicepython.org/exercise/2014/04/25/12-list-ends.html). The task text and cases here are new.
