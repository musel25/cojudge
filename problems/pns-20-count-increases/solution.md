## Steps

1. Start the index at 1.
2. Compare nums[index] with nums[index - 1].
3. Count only strict increases.

## Edge case

Equal neighbors do not count. Empty and one-item lists have no neighboring pair.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
count = 0
for index in range(1, len(nums)):
    if nums[index] > nums[index - 1]:
        count += 1
print(count)
```
