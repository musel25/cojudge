## Steps

1. Return 0 for numbers below 2.
2. Try possible divisors from 2 up to the number before number.
3. Return 0 if one divides evenly. Otherwise return 1.

## Edge case

Zero and 1 are not prime. The number 2 is prime because there are no divisors to try in the loop.

## One correct answer

```python
def is_prime(number):
    if number < 2:
        return 0
    for divisor in range(2, number):
        if number % divisor == 0:
            return 0
    return 1

number = int(input())
print(is_prime(number))
```

Inspired by [this public exercise](https://www.practicepython.org/exercise/2014/04/16/11-check-primality-functions.html). The task text and cases here are new.
