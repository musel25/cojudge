## Learn

break stops a loop early. Positions start at 0. Save the first matching position before you stop.

**Idea en español:** break detiene un ciclo. La primera posición de una lista es 0.

```python
for position in range(4):
    if position == 2:
        break
```

## Your task

Read a count, then that many numbers. Show the position of the first negative number. Show -1 when there is none. The count is 0 through 12.

**En español:** Lee la cantidad de datos y los datos. Muestra la posición del primer número negativo. Usa -1 si no hay uno.

**Example 1**

Input:

```text
4
5
-2
-3
7
```

Result:

```text
1
```

**Example 2**

Input:

```text
3
1
2
3
```

Result:

```text
-1
```

Start with the supplied code. Change the code near the comment.
