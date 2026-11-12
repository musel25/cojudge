## Learn

return ends a function. You can return early when a value is too small or too large.

**Idea en español:** return termina la función. Puedes usarlo en distintos casos.

```python
def at_least_zero(value):
    if value < 0:
        return 0
    return value
```

## Your task

Complete clamp(value, low, high). Return low if value is below low. Return high if value is above high. Otherwise return value. low is never greater than high.

**En español:** Limita value al intervalo de low a high. Devuelve el límite si value está fuera.

**Example 1**

Input:

```text
15
0
10
```

Result:

```text
10
```

**Example 2**

Input:

```text
6
0
10
```

Result:

```text
6
```

Start with the supplied code. Change the code near the comment.
