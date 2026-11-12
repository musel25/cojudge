## Steps

1. Start an empty answer list.
2. Visit each input number.
3. Append it only when it is below limit.

## Edge case

A value equal to the limit does not qualify. An empty answer prints no numbers.

## One correct answer

```python
nums = []
for part in input().split():
    nums.append(int(part))
limit = int(input())
answer = []
for number in nums:
    if number < limit:
        answer.append(number)
for number in answer:
    print(number)
```

Inspired by [this public exercise](https://www.practicepython.org/exercise/2014/02/15/03-list-less-than-ten.html). The task text and cases here are new.
