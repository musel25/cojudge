## Steps

1. Start an empty seen set.
2. Check each number before you add it.
3. Stop at the first number already in seen.

## Edge case

An empty list or a list without repeats gives -1. The number -1 can itself repeat and is still a valid result.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
seen = set()
answer = -1
for number in nums:
    if number in seen:
        answer = number
        break
    seen.add(number)
print(answer)
```
