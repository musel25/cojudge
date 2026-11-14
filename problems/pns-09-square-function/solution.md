## Steps

1. Define square with one parameter named number.
2. Return number multiplied by itself.
3. Read one integer, call square, and print its result.

## Edge case

A negative number squared gives a positive result. Zero gives zero.

## One correct answer

```python
def square(number):
    return number * number

number = int(input())
print(square(number))
```
