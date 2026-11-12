## Steps

1. Count and add the numbers.
2. Find the largest only when the list is not empty.
3. Use a set to count different values.

## Edge case

All four report values are 0 for an empty list. A list of negative values can have a negative largest value.

## One correct answer

```python
nums = [int(part) for part in input().split()]
count = len(nums)
total = sum(nums)
largest = max(nums) if nums else 0
different = len(set(nums))
print(count, total, largest, different)
```
