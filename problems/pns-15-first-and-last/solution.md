## Steps

1. The starter builds nums.
2. Use nums[0] for the first value.
3. Use nums[-1] for the last value.

## Edge case

A one-item list has the same first and last value.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
print(nums[0], nums[-1])
```

Inspired by [this public exercise](https://www.practicepython.org/exercises/). The task text and cases here are new.
