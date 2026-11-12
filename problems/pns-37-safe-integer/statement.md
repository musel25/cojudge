## Learn

try runs code that may fail. except ValueError handles text that int() cannot change to a number.

```python
try:
    number = int("cat")
except ValueError:
    number = 0
print(number)
```

This code prints:

```text
0
```

## Your task

Read one line. Try int(text). Show the number if it works. Show 0 if it raises ValueError. Numbers use digits 0 through 9 and stay from -1000 through 1000. Spaces around a number are allowed. One underscore may separate digits, as in 1_0.

**Example 1**

Input:

```text
42
```

Result:

```text
42
```

Why: int("42") gives 42, so show 42.

**Example 2**

Input:

```text
cat
```

Result:

```text
0
```

Why: int("cat") raises ValueError. Show 0 instead.

Start with the supplied code. Change the code near the comment.
