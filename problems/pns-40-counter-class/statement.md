## Learn

A class keeps data and actions together. __init__ starts the value. A method can change or read it.

**Idea en español:** Una clase guarda datos y acciones juntos. Sus métodos cambian o leen esos datos.

```python
class Box:
    def __init__(self):
        self.value = 0

box = Box()
print(box.value)  # 0
```

## Your task

Complete Counter. add(number) adds a number. reset() sets the total to 0. value() returns the total. The starter reads commands: add number, reset, or value. Show one number for each value command.

**En español:** Completa Counter. add suma, reset vuelve a 0 y value devuelve el total.

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

When the result has several numbers, you can put spaces or new lines between them.

Start with the supplied code. Change the code near the comment.
