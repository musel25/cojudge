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
    task: 'Read one line of space-separated integers. Print four values in this order: number of integers, their sum, largest integer, and number of different integers. Separate values with spaces or new lines. If the line is blank, print 0 0 0 0.',
    examples: [{ input: '2 2 5', output: '3 9 5 2' }, { input: '\n', output: '0 0 0 0' }],
    starter: '# Read integers. Print count, sum, largest, and unique count.\n',
    solution: readList + 'count = len(nums)\ntotal = sum(nums)\nlargest = max(nums) if nums else 0\ndifferent = len(set(nums))\nprint(count, total, largest, different)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint total = 0;\nint largest = nums.isEmpty() ? 0 : Collections.max(nums);\nfor (int value : nums) total += value;\nreturn nums.size() + " " + total + " " + largest + " " + new HashSet<>(nums).size();',
    steps: ['Count and add the numbers.', 'Find the largest only when the list is not empty.', 'Use a set to count different values.'],
    edge: 'All four report values are 0 for an empty list. A list of negative values can have a negative largest value.',
    hints: ['Read the line into a list of integers.', 'An empty list has no largest value, so use 0 for that part.'],
    tests: makeTests(['2 2 5', '\n', '-3 -2 -2', '7', '0 0 0'], r => numberLine(randomNumbers(r, { min: -50, max: 50 })) || '\n', 135)
  },
  {
    num: 36, slug: 'word-report', title: 'Word Report', category: '06-more-python', kind: 'numbers',
    learn: 'You can make one report from several string and set operations. split() gives a list of words.',
    learnCode: 'words = "red blue red".split()\nprint(len(words), len(set(words)))  # 3 2',
    task: 'Read one line of lower-case words separated by spaces. Print three values in this order: number of words, number of different words, and length of the longest word. Separate values with spaces or new lines. A blank line gives 0 0 0.',
    examples: [{ input: 'red blue red', output: '3 2 4' }, { input: '\n', output: '0 0 0' }],
    starter: '# Read words. Print word count, unique count, and longest length.\n',
    solution: 'text = input()\nwords = text.split()\nlongest = 0\nfor word in words:\n    if len(word) > longest:\n        longest = len(word)\nprint(len(words), len(set(words)), longest)\n',
    java: 'String text = nextLine().trim();\nif (text.isEmpty()) return "0 0 0";\nString[] words = text.split("\\\\s+");\nint longest = 0;\nfor (String word : words) longest = Math.max(longest, word.length());\nreturn words.length + " " + new HashSet<>(Arrays.asList(words)).size() + " " + longest;',
    steps: ['Use split() to get the words.', 'Use len() and set() for the first two values.', 'Visit the words to find the greatest length.'],
    edge: 'An empty line has no words. The longest length stays 0.',
    hints: ['Split the line into words.', 'Start the longest length at 0 so an empty line works.'],
    tests: makeTests(['red blue red', '\n', 'cat', 'a bb ccc', 'sun sun sun'], r => phrase(r) || '\n', 136)
  },
  {
    num: 37, slug: 'safe-integer', title: 'Safe Integer', category: '06-more-python', kind: 'numbers',
    learn: 'try runs code that may fail. except ValueError handles text that int() cannot change to a number.',
    learnCode: 'try:\n    number = int("cat")\nexcept ValueError:\n    number = 0\nprint(number)',
    task: 'Read one line of text. Try to change the whole line with int(text). Print the integer if that works. Print 0 if int(text) raises ValueError. Valid numbers stay between -1000 and 1000. Spaces around a number and one underscore between digits are allowed.',
    examples: [{ input: '42', output: '42' }, { input: 'cat', output: '0' }],
    starter: '# Read text. Print int(text), or 0 when conversion fails.\n',
    solution: 'text = input()\ntry:\n    number = int(text)\nexcept ValueError:\n    number = 0\nprint(number)\n',
    java: 'String text = nextLine().trim();\nif (!text.matches("[+-]?[0-9](?:_?[0-9])*")) return "0";\ntry { return String.valueOf(Integer.parseInt(text.replace("_", ""))); } catch (NumberFormatException error) { return "0"; }',
    steps: ['Read the text.', 'Try int(text).', 'Use 0 only when int() raises ValueError.'],
    edge: 'An empty line and a decimal such as 3.5 are invalid integers. Both give 0.',
    hints: ['Put the conversion in a try block.', 'Catch ValueError and print 0 for invalid text.'],
    source: 'https://www.practicepython.org/exercise/2022/07/17/40-error-checking.html',
    tests: makeTests(['42', 'cat', '\n', '  -7  ', '0', '3.5', '+12', '1000', '-1000', '1_0', '1__0'], r => { const choices = ['hello', ' ', '3.14', 'x5', String(randomInt(r, -1000, 1000)), ` ${randomInt(r, -1000, 1000)} `]; return choices[randomInt(r, 0, choices.length - 1)]; }, 137),
    rejections: [{ input: '1_0', output: '0' }]
  },
  {
    num: 38, slug: 'json-total', title: 'JSON Total', category: '06-more-python', kind: 'numbers',
    learn: 'import brings a Python module into your program. json.loads() reads a JSON list such as [2, 3, 4].',
    learnCode: 'import json\nnums = json.loads("[2, 3]")\nprint(nums)  # [2, 3]',
    task: 'Read one line containing a JSON list of integers. The JSON is always valid. Print the sum of the integers. An empty list gives 0.',
    examples: [{ input: '[2, 3, 4]', output: '9' }, { input: '[]', output: '0' }],
    starter: '# Read a JSON list of integers and print its sum.\n',
    solution: 'import json\n\nnums = json.loads(input())\nprint(sum(nums))\n',
    java: 'String raw = nextLine().trim();\nString inner = raw.substring(1, raw.length() - 1).trim();\nif (inner.isEmpty()) return "0";\nint total = 0;\nfor (String part : inner.split(",")) total += Integer.parseInt(part.trim());\nreturn String.valueOf(total);',
    steps: ['Import json.', 'Use json.loads() to turn the input into a Python list.', 'Add the list values with sum().'],
    edge: 'sum([]) is 0, so the empty list needs no special branch.',
    hints: ['Import the json module.', 'Use json.loads() to change the input text into a list.'],
    tests: makeTests(['[2, 3, 4]', '[]', '[5]', '[-2, 2]', '[0, 0]'], r => JSON.stringify(randomNumbers(r, { min: -100, max: 100 })), 138)
  },
  {
    num: 39, slug: 'distance-between-points', title: 'Distance Between Points', category: '06-more-python', kind: 'numbers',
    learn: 'A tuple can hold two values. You can unpack it into two names. abs() makes a difference non-negative.',
    learnCode: 'point = (2, 5)\nx, y = point\nprint(x, y)  # 2 5',
    task: 'Read two lines. Each line contains the x and y coordinates of one point, separated by a space. Print the grid distance between the points: abs(x1 - x2) + abs(y1 - y2). For (1, 2) and (4, 6), print 7.',
    examples: [{ input: '1 2\n4 6', output: '7' }, { input: '0 0\n0 0', output: '0' }],
    starter: '# Read two points. Print their grid distance.\n',
    solution: 'parts = input().split()\nfirst = (int(parts[0]), int(parts[1]))\nparts = input().split()\nsecond = (int(parts[0]), int(parts[1]))\nx1, y1 = first\nx2, y2 = second\nprint(abs(x1 - x2) + abs(y1 - y2))\n',
    java: 'List<Integer> first = ints(nextLine());\nList<Integer> second = ints(nextLine());\nreturn String.valueOf(Math.abs(first.get(0) - second.get(0)) + Math.abs(first.get(1) - second.get(1)));',
    steps: ['Read two points.', 'Unpack each pair into x and y.', 'Add the absolute x difference and absolute y difference.'],
    edge: 'Two equal points have distance 0. Coordinates may be negative.',
    hints: ['Split each line into two integer coordinates.', 'Use abs() on each coordinate difference before adding them.'],
    tests: makeTests(['1 2\n4 6', '0 0\n0 0', '-2 -3\n2 1', '5 0\n0 5'], r => `${numberLine(randomNumbers(r, { minLength: 2, maxLength: 2, min: -50, max: 50 }))}\n${numberLine(randomNumbers(r, { minLength: 2, maxLength: 2, min: -50, max: 50 }))}`, 139)
  },
  {
    num: 40, slug: 'counter-class', title: 'Counter Class', category: '06-more-python', kind: 'numbers',
    learn: 'A class keeps data and actions together. __init__ starts the value. A method can change or read it.',
    learnCode: 'class Box:\n    def __init__(self):\n        self.value = 0\n\nbox = Box()\nprint(box.value)  # 0',
    task: 'Write a class named Counter. Its __init__ method starts a total at 0. Its add(number) method adds number to that total. Its reset() method sets the total to 0. Its value() method returns the total. Then read a count from the first line and read that many command lines. Each command is add followed by an integer, reset, or value. Run commands in order. Print one number for each value command. A sequence can have no value commands.',
    examples: [{ input: '5\nadd 3\nvalue\nadd 2\nvalue\nreset', output: '3 5' }, { input: '2\nreset\nvalue', output: '0' }],
    starter: '# Write Counter and read commands. Print a result for each value command.\n',
    solution: 'class Counter:\n    def __init__(self):\n        self.total = 0\n\n    def add(self, number):\n        self.total += number\n\n    def reset(self):\n        self.total = 0\n\n    def value(self):\n        return self.total\n\ncount = int(input())\ncounter = Counter()\nfor _ in range(count):\n    command = input().split()\n    if command[0] == "add":\n        counter.add(int(command[1]))\n    elif command[0] == "reset":\n        counter.reset()\n    else:\n        print(counter.value())\n',
    java: 'int count = nextInt();\nint total = 0;\nList<Integer> shown = new ArrayList<>();\nfor (int i = 0; i < count; i++) {\n    String[] command = nextLine().split(" ");\n    if (command[0].equals("add")) total += Integer.parseInt(command[1]);\n    else if (command[0].equals("reset")) total = 0;\n    else shown.add(total);\n}\nreturn join(shown);',
    steps: ['Store the total in self.total.', 'Change it in add() and reset().', 'Return it in value(). Read the commands and call the matching methods.'],
    edge: 'value before any add shows 0. reset removes all earlier additions. add can receive a negative number.',
    hints: ['Store the total on self so every method can use it.', 'Read each command after the count and call the matching method.'],
    tests: makeTests(['5\nadd 3\nvalue\nadd 2\nvalue\nreset', '2\nreset\nvalue', '1\nvalue', '3\nadd -2\nvalue\nreset', '0'], r => { const count = randomInt(r, 1, 12); const commands = Array.from({ length: count }, () => { const type = randomInt(r, 0, 2); return type === 0 ? `add ${randomInt(r, -10, 10)}` : type === 1 ? 'reset' : 'value'; }); return [count, ...commands].join('\n'); }, 140)
  }
];
