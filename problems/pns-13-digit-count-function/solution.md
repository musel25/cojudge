## Steps

1. Return 1 for 0.
2. For other numbers, divide by 10 until no digits remain.
3. Count each division.

## Edge case

The special case for 0 stops the function from returning 0 digits.

## One correct answer

```python
def digit_count(number):
    if number == 0:
        return 1
    count = 0
    while number > 0:
        count += 1
        number //= 10
    return count

number = int(input())
print(digit_count(number))
```
