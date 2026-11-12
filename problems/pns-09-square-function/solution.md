## Steps

1. The function receives number.
2. Multiply number by itself.
3. Return the result. The supplied call prints it.

## Edge case

A negative number squared gives a positive result. Zero gives zero.

## One correct answer

```python
def square(number):
    return number * number

number = int(input())
print(square(number))
```
