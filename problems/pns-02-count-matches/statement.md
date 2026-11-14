## Learn

A for loop can repeat an action a fixed number of times. In the example below, range(3) makes the loop run three times. The name _ means the program does not need the loop number. You can use this kind of loop when an input line tells you how many more lines to read.

```python
for _ in range(3):
    print("hello")
```

This code prints:

```text
hello
hello
hello
```

## Your task

Read the target integer from the first line. Read the count from the second line. Read exactly that many more lines, with one integer on each line. Print how many of those integers equal the target. Print only the number. The count is 0 through 12.

**Example 1**

Input:

```text
3
4
3
2
3
3
```

Result:

```text
3
```

Why: The first line sets the target to 3. The second line says that four numbers follow: 3, 2, 3, 3. Three of those four numbers equal 3.

**Example 2**

Input:

```text
5
0
```

Result:

```text
0
```

Why: The second line is 0, so no numbers follow it. The number of matches is 0.

Write the full program. The starter comment is a reminder of the input format.
