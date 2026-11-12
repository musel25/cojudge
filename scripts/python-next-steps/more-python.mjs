import { makeTests, numberLine, randomInt, randomNumbers } from './cases.mjs';

const words = ['sun', 'blue', 'cat', 'code', 'moon', 'red'];
const phrase = random => Array.from(
  { length: randomInt(random, 0, 10) },
  () => words[randomInt(random, 0, words.length - 1)]
).join(' ');
const readList = 'nums = [int(part) for part in input().split()]\n';

export const morePython = [
  {
    num: 35, slug: 'number-report', title: 'Number Report', category: '06-more-python', kind: 'numbers',
    learn: 'A function can return several useful values. Use len(), sum(), max(), and set() on the same list.',
    learnCode: 'nums = [2, 2, 5]\nprint(len(nums), sum(nums))  # 3 9',
    task: 'Read one line of numbers. Show four values: count, sum, largest value, and number of different values. For an empty list, use 0 for the largest value.',
    spanish: 'Muestra cantidad, suma, máximo y cantidad de valores diferentes. Usa máximo 0 si la lista está vacía.',
    examples: [{ input: '2 2 5', output: '3 9 5 2' }, { input: '\n', output: '0 0 0 0' }],
    starter: readList + '# Find the four report values.\n',
    solution: readList + 'count = len(nums)\ntotal = sum(nums)\nlargest = max(nums) if nums else 0\ndifferent = len(set(nums))\nprint(count, total, largest, different)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint total = 0;\nint largest = nums.isEmpty() ? 0 : Collections.max(nums);\nfor (int value : nums) total += value;\nreturn nums.size() + " " + total + " " + largest + " " + new HashSet<>(nums).size();',
    steps: ['Count and add the numbers.', 'Find the largest only when the list is not empty.', 'Use a set to count different values.'],
    edge: 'All four report values are 0 for an empty list. A list of negative values can have a negative largest value.',
    hints: ['Use len(nums) and sum(nums).', 'Use max(nums) if nums else 0.'],
    tests: makeTests(['2 2 5', '\n', '-3 -2 -2', '7', '0 0 0'], r => numberLine(randomNumbers(r, { min: -50, max: 50 })) || '\n', 135)
  },
  {
    num: 36, slug: 'word-report', title: 'Word Report', category: '06-more-python', kind: 'numbers',
    learn: 'You can make one report from several string and set operations. split() gives a list of words.',
    learnCode: 'words = "red blue red".split()\nprint(len(words), len(set(words)))  # 3 2',
    task: 'Read one line of lower-case words separated by spaces. Show three values: word count, different-word count, and longest word length. A blank line gives 0 0 0.',
    spanish: 'Muestra cantidad de palabras, palabras diferentes y longitud de la palabra más larga.',
    examples: [{ input: 'red blue red', output: '3 2 4' }, { input: '\n', output: '0 0 0' }],
    starter: 'text = input()\nwords = text.split()\n# Find the three report values.\n',
    solution: 'text = input()\nwords = text.split()\nlongest = 0\nfor word in words:\n    if len(word) > longest:\n        longest = len(word)\nprint(len(words), len(set(words)), longest)\n',
    java: 'String text = nextLine().trim();\nif (text.isEmpty()) return "0 0 0";\nString[] words = text.split("\\\\s+");\nint longest = 0;\nfor (String word : words) longest = Math.max(longest, word.length());\nreturn words.length + " " + new HashSet<>(Arrays.asList(words)).size() + " " + longest;',
    steps: ['Use split() to get the words.', 'Use len() and set() for the first two values.', 'Visit the words to find the greatest length.'],
    edge: 'An empty line has no words. The longest length stays 0.',
    hints: ['Start longest at 0.', 'Update it when len(word) is larger.'],
    tests: makeTests(['red blue red', '\n', 'cat', 'a bb ccc', 'sun sun sun'], r => phrase(r) || '\n', 136)
  },
  {
    num: 37, slug: 'safe-integer', title: 'Safe Integer', category: '06-more-python', kind: 'numbers',
    learn: 'try runs code that may fail. except ValueError handles text that int() cannot change to a number.',
    learnCode: 'try:\n    number = int("7")\nexcept ValueError:\n    number = 0',
    task: 'Read one line. If it is a whole number from -1000 through 1000, show that number. If int() cannot read it, show 0. Spaces around a number are allowed.',
    spanish: 'Lee una línea. Muestra el número entero. Si no se puede convertir con int(), muestra 0.',
    examples: [{ input: '42', output: '42' }, { input: 'cat', output: '0' }],
    starter: 'text = input()\n# Try to change text to an integer.\n',
    solution: 'text = input()\ntry:\n    number = int(text)\nexcept ValueError:\n    number = 0\nprint(number)\n',
    java: 'String text = nextLine().trim();\ntry { return String.valueOf(Integer.parseInt(text)); } catch (NumberFormatException error) { return "0"; }',
    steps: ['Read the text.', 'Try int(text).', 'Use 0 only when int() raises ValueError.'],
    edge: 'An empty line and a decimal such as 3.5 are invalid integers. Both give 0.',
    hints: ['Put int(text) inside try.', 'Catch ValueError and use 0.'],
    source: 'https://www.practicepython.org/exercises/',
    tests: makeTests(['42', 'cat', '\n', '  -7  ', '0', '3.5', '+12', '1000', '-1000'], r => { const choices = ['hello', ' ', '3.14', 'x5', String(randomInt(r, -1000, 1000)), ` ${randomInt(r, -1000, 1000)} `]; return choices[randomInt(r, 0, choices.length - 1)]; }, 137)
  },
  {
    num: 38, slug: 'json-total', title: 'JSON Total', category: '06-more-python', kind: 'numbers',
    learn: 'import brings a Python module into your program. json.loads() reads a JSON list such as [2, 3, 4].',
    learnCode: 'import json\nnums = json.loads("[2, 3]")\nprint(nums)  # [2, 3]',
    task: 'Read one JSON list of whole numbers. Show its sum. The input is always valid JSON. A list may be empty.',
    spanish: 'Lee una lista JSON de números enteros. Muestra su suma.',
    examples: [{ input: '[2, 3, 4]', output: '9' }, { input: '[]', output: '0' }],
    starter: 'import json\n\nnums = json.loads(input())\n# Add the numbers.\n',
    solution: 'import json\n\nnums = json.loads(input())\nprint(sum(nums))\n',
    java: 'String raw = nextLine().trim();\nString inner = raw.substring(1, raw.length() - 1).trim();\nif (inner.isEmpty()) return "0";\nint total = 0;\nfor (String part : inner.split(",")) total += Integer.parseInt(part.trim());\nreturn String.valueOf(total);',
    steps: ['Import json.', 'Use json.loads() to turn the input into a Python list.', 'Add the list values with sum().'],
    edge: 'sum([]) is 0, so the empty list needs no special branch.',
    hints: ['The starter already reads JSON.', 'Use sum(nums).'],
    tests: makeTests(['[2, 3, 4]', '[]', '[5]', '[-2, 2]', '[0, 0]'], r => JSON.stringify(randomNumbers(r, { min: -100, max: 100 })), 138)
  },
  {
    num: 39, slug: 'distance-between-points', title: 'Distance Between Points', category: '06-more-python', kind: 'numbers',
    learn: 'A tuple can hold two values. You can unpack it into two names. abs() makes a difference non-negative.',
    learnCode: 'point = (2, 5)\nx, y = point\nprint(x, y)  # 2 5',
    task: 'Read two points. Each line has x and y separated by a space. Show abs(x1 - x2) + abs(y1 - y2). This is the distance across grid rows and columns.',
    spanish: 'Lee dos puntos. Suma la diferencia absoluta entre sus x y entre sus y.',
    examples: [{ input: '1 2\n4 6', output: '7' }, { input: '0 0\n0 0', output: '0' }],
    starter: 'parts = input().split()\nfirst = (int(parts[0]), int(parts[1]))\nparts = input().split()\nsecond = (int(parts[0]), int(parts[1]))\n# Unpack both points and find the distance.\n',
    solution: 'parts = input().split()\nfirst = (int(parts[0]), int(parts[1]))\nparts = input().split()\nsecond = (int(parts[0]), int(parts[1]))\nx1, y1 = first\nx2, y2 = second\nprint(abs(x1 - x2) + abs(y1 - y2))\n',
    java: 'List<Integer> first = ints(nextLine());\nList<Integer> second = ints(nextLine());\nreturn String.valueOf(Math.abs(first.get(0) - second.get(0)) + Math.abs(first.get(1) - second.get(1)));',
    steps: ['Read two points.', 'Unpack each pair into x and y.', 'Add the absolute x difference and absolute y difference.'],
    edge: 'Two equal points have distance 0. Coordinates may be negative.',
    hints: ['Use x1, y1 = first.', 'Use abs() for each difference.'],
    tests: makeTests(['1 2\n4 6', '0 0\n0 0', '-2 -3\n2 1', '5 0\n0 5'], r => `${numberLine(randomNumbers(r, { minLength: 2, maxLength: 2, min: -50, max: 50 }))}\n${numberLine(randomNumbers(r, { minLength: 2, maxLength: 2, min: -50, max: 50 }))}`, 139)
  },
  {
    num: 40, slug: 'counter-class', title: 'Counter Class', category: '06-more-python', kind: 'numbers',
    learn: 'A class keeps data and actions together. __init__ starts the value. A method can change or read it.',
    learnCode: 'class Box:\n    def __init__(self):\n        self.value = 0\n\nbox = Box()\nprint(box.value)  # 0',
    task: 'Complete Counter. add(number) adds a number. reset() sets the total to 0. value() returns the total. The starter reads commands: add number, reset, or value. Show one number for each value command.',
    spanish: 'Completa Counter. add suma, reset vuelve a 0 y value devuelve el total.',
    examples: [{ input: '5\nadd 3\nvalue\nadd 2\nvalue\nreset', output: '3 5' }, { input: '2\nreset\nvalue', output: '0' }],
    starter: 'class Counter:\n    def __init__(self):\n        self.total = 0\n\n    def add(self, number):\n        # Add number.\n        pass\n\n    def reset(self):\n        # Start again at 0.\n        pass\n\n    def value(self):\n        # Return the total.\n        return 0\n\ncount = int(input())\ncounter = Counter()\nfor _ in range(count):\n    command = input().split()\n    if command[0] == "add":\n        counter.add(int(command[1]))\n    elif command[0] == "reset":\n        counter.reset()\n    else:\n        print(counter.value())\n',
    solution: 'class Counter:\n    def __init__(self):\n        self.total = 0\n\n    def add(self, number):\n        self.total += number\n\n    def reset(self):\n        self.total = 0\n\n    def value(self):\n        return self.total\n\ncount = int(input())\ncounter = Counter()\nfor _ in range(count):\n    command = input().split()\n    if command[0] == "add":\n        counter.add(int(command[1]))\n    elif command[0] == "reset":\n        counter.reset()\n    else:\n        print(counter.value())\n',
    java: 'int count = nextInt();\nint total = 0;\nList<Integer> shown = new ArrayList<>();\nfor (int i = 0; i < count; i++) {\n    String[] command = nextLine().split(" ");\n    if (command[0].equals("add")) total += Integer.parseInt(command[1]);\n    else if (command[0].equals("reset")) total = 0;\n    else shown.add(total);\n}\nreturn join(shown);',
    steps: ['Store the total in self.total.', 'Change it in add() and reset().', 'Return it in value(). The supplied loop reads and runs the commands.'],
    edge: 'value before any add shows 0. reset removes all earlier additions. add can receive a negative number.',
    hints: ['Use self.total in each method.', 'add uses +=; reset uses = 0.'],
    tests: makeTests(['5\nadd 3\nvalue\nadd 2\nvalue\nreset', '2\nreset\nvalue', '1\nvalue', '3\nadd -2\nvalue\nreset', '0'], r => { const count = randomInt(r, 1, 12); const commands = Array.from({ length: count }, () => { const type = randomInt(r, 0, 2); return type === 0 ? `add ${randomInt(r, -10, 10)}` : type === 1 ? 'reset' : 'value'; }); return [count, ...commands].join('\n'); }, 140)
  }
];
