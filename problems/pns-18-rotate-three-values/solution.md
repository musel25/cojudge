## Steps

1. Read the three values into nums.
2. Get the second and third values with indexes 1 and 2.
3. Show the first value last.

## Edge case

Equal values stay equal. The positions still move.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
print(nums[1], nums[2], nums[0])
```

Inspired by [this public exercise](https://codingbat.com/python/List-1). The task text and cases here are new.
