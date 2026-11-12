## Steps

1. Make a set from each list.
2. Use & to keep only values in both sets.
3. Sort and show the shared values.

## Edge case

If either line is blank, the result is empty.

## One correct answer

```python
left = [int(part) for part in input().split()]
right = [int(part) for part in input().split()]
answer = sorted(set(left) & set(right))
for number in answer:
    print(number)
```

Inspired by [this public exercise](https://www.practicepython.org/exercise/2014/03/05/05-list-overlap.html). The task text and cases here are new.
