# Python Next Steps course design

## Purpose

Give a learner who completed Python First Steps a broad, calm introduction to core Python. The first course covered `print`, variables, `input`, conditions, and simple games. This course starts with loops and ends with small programs that combine skills.

## Learner needs

- Use short English sentences and one new idea at a time.
- Give a short Spanish task summary. Keep Python names and code unchanged.
- Show input and output examples before hidden tests.
- Judge the computed result. Do not require English sentences when the lesson is about logic.
- Give a step-by-step explanation after the learner tries the problem.
- Keep each task independent. A learner can pause after any task.

## Scope

Build a new repository course named **Python Next Steps** with 40 Python script problems. Use `pns-01` through `pns-40` slugs. Keep the existing Python First Steps and Basic 50 content unchanged. Publish through a reviewable pull request. Do not merge or deploy in this task.

| Section | Problems | Main skill |
| --- | --- | --- |
| Loops | 1–8 | `for`, `range`, `while`, `break`, nested loops |
| Functions | 9–14 | `def`, parameters, `return`, reusable code |
| Lists | 15–22 | indexing, loops, `append`, slices, new lists |
| Strings | 23–28 | indexing, slices, case, `split`, compare positions |
| Sets and dictionaries | 29–34 | unique values, membership, lookup, counting |
| More Python | 35–40 | combined reports, errors, modules, tuples, a small class |

## Problem sequence

1. Sum even numbers
2. Count matches
3. Sum until zero
4. First negative position
5. Count divisors
6. Sum squares
7. Even grid positions
8. Reach a power of two
9. Square function
10. Inside a range
11. Clamp a number
12. Sum a range
13. Digit count function
14. Prime check
15. First and last
16. Sum positive values
17. Keep small values
18. Rotate three values
19. Running totals
20. Count increases
21. Reverse a list
22. Square a list
23. First two letters
24. Reverse text
25. Count vowels
26. Different positions
27. Count words
28. Make an acronym
29. Count unique values
30. Common numbers
31. Count a word
32. First repeated number
33. Look up a score
34. Add scores by name
35. Number report
36. Word report
37. Safe integer
38. JSON total
39. Distance between points
40. Counter class

## Source use

Adapt exercise ideas from [Practice Python](https://www.practicepython.org/exercises/), [CodingBat Python](https://codingbat.com/python), and the [Exercism Python track](https://github.com/exercism/python). Exercism's repository is MIT licensed. Write original, simpler task text, examples, solutions, and tests. Add direct source links to the relevant answer pages and a course source note. Do not copy source text or code.

## Judge rules

- Each task uses Python script mode and at least 25 official cases.
- Most tasks print numbers or values from the input. List outputs use space-separated numbers, and the marker compares numeric values, not spacing.
- String transformation tasks compare the resulting string. Their task text states exact case rules.
- Inputs stay within stated bounds. Each explanation names its relevant boundary cases.
- A visible `Run` sample shows a normal case and an edge case.
- A saved reference program must pass the isolated real judge for every task. Prepared wrong programs must fail representative boundary cases.

## Outside this course

File operations and larger projects need a later course. The script judge has a short run limit and a temporary filesystem. This course teaches the core language first.
