## Learn

A set can tell you whether you saw a value before. Add each new value after you check it.

**Idea en español:** Un conjunto puede indicar si ya viste un valor.

```python
seen = set()
seen.add(4)
print(4 in seen)  # True
```

## Your task

Read one line of numbers. Show the first value that appears for a second time as you read left to right. Show -1 if no value repeats.

**En español:** Muestra el primer número que aparece por segunda vez. Usa -1 si ninguno se repite.

**Example 1**

Input:

```text
3 5 3 5
```

Result:

```text
3
```

**Example 2**

Input:

```text
1 2 3
```

Result:

```text
-1
```

Start with the supplied code. Change the code near the comment.
