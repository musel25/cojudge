## Learn

A loop can run inside another loop. This lets you visit every row and column pair in a grid.

**Idea en español:** Un ciclo dentro de otro visita cada par de fila y columna.

```python
for row in range(2):
    for column in range(3):
        print(row, column)
```

## Your task

Read rows and columns. Count the grid positions where row + column is even. Rows and columns start at 0. Both sizes use 0 through 10.

**En español:** Lee la cantidad de filas y columnas. Cuenta las posiciones donde fila + columna es par.

**Example 1**

Input:

```text
2
3
```

Result:

```text
3
```

**Example 2**

Input:

```text
0
5
```

Result:

```text
0
```

Start with the supplied code. Change the code near the comment.
