## Learn

A class keeps data and actions together. __init__ starts the value. A method can change or read it.

```python
class Box:
    def __init__(self):
        self.value = 0

box = Box()
print(box.value)  # 0
```

This code prints:

```text
0
```

## Your task

Write a class named Counter. Its __init__ method starts a total at 0. Its add(number) method adds number to that total. Its reset() method sets the total to 0. Its value() method returns the total. Then read a count from the first line and read that many command lines. Each command is add followed by an integer, reset, or value. Run commands in order. Print one number for each value command. A sequence can have no value commands.

**Example 1**

Input:

```text
5
add 3
value
add 2
value
reset
```

Result:

```text
3 5
```

Why: Add 3, then show 3. Add 2 to get 5, then show 5. The final reset has no value command after it.

**Example 2**

Input:

```text
2
reset
value
```

Result:

```text
0
```

Why: Reset sets the total to 0. The value command shows 0.

When the result has several numbers, you can put spaces or new lines between them.

Write the full program. The starter comment is a reminder of the task.
