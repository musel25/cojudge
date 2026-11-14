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

Read one line of text. Try to change the whole line with int(text). Print the integer if that works. Print 0 if int(text) raises ValueError. Valid numbers stay between -1000 and 1000. Spaces around a number and one underscore between digits are allowed.

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

Write the full program. The starter comment is a reminder of the task.
