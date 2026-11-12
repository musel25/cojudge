## Steps

1. Change the text to lower case.
2. Visit each letter.
3. Count it when it is in aeiou.

## Edge case

A line without vowels, including an empty line, gives 0.

## One correct answer

```python
text = input()
count = 0
for letter in text.lower():
    if letter in "aeiou":
        count += 1
print(count)
```
