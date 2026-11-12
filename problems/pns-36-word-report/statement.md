## Learn

You can make one report from several string and set operations. split() gives a list of words.

**Idea en español:** Puedes combinar listas, conjuntos y ciclos en un reporte de texto.

```python
words = "red blue red".split()
print(len(words), len(set(words)))  # 3 2
```

## Your task

Read one line of lower-case words separated by spaces. Show three values: word count, different-word count, and longest word length. A blank line gives 0 0 0.

**En español:** Muestra cantidad de palabras, palabras diferentes y longitud de la palabra más larga.

**Example 1**

Input:

```text
red blue red
```

Result:

```text
3 2 4
```

**Example 2**

Input:

_One blank line_

Result:

```text
0 0 0
```

When the result has several numbers, you can put spaces or new lines between them.

Start with the supplied code. Change the code near the comment.
