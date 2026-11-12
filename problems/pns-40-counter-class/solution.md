## Steps

1. Store the total in self.total.
2. Change it in add() and reset().
3. Return it in value(). The supplied loop reads and runs the commands.

## Edge case

value before any add shows 0. reset removes all earlier additions. add can receive a negative number.

## One correct answer

```python
class Counter:
    def __init__(self):
        self.total = 0

    def add(self, number):
        self.total += number

    def reset(self):
        self.total = 0

    def value(self):
        return self.total

count = int(input())
counter = Counter()
for _ in range(count):
    command = input().split()
    if command[0] == "add":
        counter.add(int(command[1]))
    elif command[0] == "reset":
        counter.reset()
    else:
        print(counter.value())
```
