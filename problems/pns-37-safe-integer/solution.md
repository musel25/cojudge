## Steps

1. Read the text.
2. Try int(text).
3. Use 0 only when int() raises ValueError.

## Edge case

An empty line and a decimal such as 3.5 are invalid integers. Both give 0.

## One correct answer

```python
text = input()
try:
    number = int(text)
except ValueError:
    number = 0
print(number)
```

Inspired by [this public exercise](https://www.practicepython.org/exercise/2022/07/17/40-error-checking.html). The task text and cases here are new.
