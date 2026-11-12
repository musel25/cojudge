## Steps

1. Read the list.
2. Make a set from it. The set keeps each value once.
3. Count the set with len().

## Edge case

An empty list makes an empty set, so the result is 0.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
print(len(set(nums)))
```

Inspired by [this public exercise](https://www.practicepython.org/exercise/2014/05/15/14-list-remove-duplicates.html). The task text and cases here are new.
