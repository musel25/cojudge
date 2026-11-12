## Learn

try runs code that may fail. except ValueError handles text that int() cannot change to a number.

**Idea en español:** try ejecuta código que puede fallar. except ValueError maneja el error de conversión.

```python
try:
    number = int("7")
except ValueError:
    number = 0
```

## Your task

Read one line. If it is a whole number from -1000 through 1000, show that number. If int() cannot read it, show 0. Spaces around a number are allowed.

**En español:** Lee una línea. Muestra el número entero. Si no se puede convertir con int(), muestra 0.

**Example 1**

Input:

```text
42
```

Result:

```text
42
```

**Example 2**

Input:

```text
cat
```

Result:

```text
0
```

Start with the supplied code. Change the code near the comment.
