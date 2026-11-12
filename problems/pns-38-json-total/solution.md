## Steps

1. Import json.
2. Use json.loads() to turn the input into a Python list.
3. Add the list values with sum().

## Edge case

sum([]) is 0, so the empty list needs no special branch.

## One correct answer

```python
import json

nums = json.loads(input())
print(sum(nums))
```
