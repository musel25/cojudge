## Learn

A loop can read several input lines. A counter starts at 0. Add 1 each time a value matches the target.

**Idea en español:** Un contador empieza en 0. Suma 1 cuando encuentras el dato buscado.

```python
matches = 0
for _ in range(3):
    value = int(input())
```

## Your task

Read a target number, then a count, then that many numbers. Show how many numbers equal the target. The count is 0 through 12.

**En español:** Lee el número buscado, la cantidad de datos y los datos. Cuenta cuántos son iguales al número buscado.

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

Start with the supplied code. Change the code near the comment.
