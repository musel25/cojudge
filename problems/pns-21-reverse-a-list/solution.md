## Steps

1. The starter reads the list.
2. Use nums[::-1] to make a backward copy.
3. Show each number in that copy.

## Edge case

Reversing an empty list still gives an empty list.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
backward = nums[::-1]
for number in backward:
    print(number)
```

Inspired by [this public exercise](https://codingbat.com/python/List-1). The task text and cases here are new.
