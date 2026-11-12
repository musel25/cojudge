## Learn

A name can appear more than once. Read its old total with get(), then add the new score.

**Idea en español:** get() permite leer un total anterior o usar 0 si aún no existe.

```python
totals = {}
totals["ada"] = totals.get("ada", 0) + 3
```

## Your task

Read a count, then that many name and score lines. A name may repeat. Add its scores. Read a query name. Show its total, or 0 if missing.

**En español:** Suma los puntajes de cada nombre. Muestra el total del nombre buscado o 0.

**Example 1**

Input:

```text
3
ada 2
bea 5
ada 4
ada
```

Result:

```text
6
```

**Example 2**

Input:

```text
1
bea 5
ada
```

Result:

```text
0
```

Start with the supplied code. Change the code near the comment.
