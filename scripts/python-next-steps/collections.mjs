import { makeTests, numberLine, randomInt, randomNumbers } from './cases.mjs';

const names = ['ada', 'bea', 'cal', 'dan', 'eve', 'fox'];
const name = random => names[randomInt(random, 0, names.length - 1)];
const line = random => numberLine(randomNumbers(random, { min: -6, max: 6 }));
const readList = 'nums = []\nfor part in input().split():\n    nums.append(int(part))\n';

export const collections = [
  {
    num: 29, slug: 'count-unique-values', title: 'Count Unique Values', category: '05-sets-and-dictionaries', kind: 'numbers',
    learn: 'A set keeps each value once. Adding 2 twice and 5 once leaves two values in the example set. In the task, count how many different input numbers the set contains.',
    learnCode: 'seen = set()\nseen.add(2)\nseen.add(2)\nseen.add(5)\nprint(seen)',
    task: 'Read one line of space-separated integers. Print how many different integers it contains. Repeated integers count once. A blank line gives 0.',
    examples: [{ input: '2 2 5', output: '2' }, { input: '4 4 4', output: '1' }],
    starter: '# Read a line of integers. Print how many different values it has.\n',
    solution: readList + 'print(len(set(nums)))\n',
    java: 'List<Integer> nums = ints(nextLine());\nreturn String.valueOf(new HashSet<>(nums).size());',
    steps: ['Read the list.', 'Make a set from it. The set keeps each value once.', 'Count the set with len().'],
    edge: 'An empty list makes an empty set, so the result is 0.',
    hints: ['Read the integers from the line.', 'A set contains each different value only once.'],
    source: 'https://www.practicepython.org/exercise/2014/05/15/14-list-remove-duplicates.html',
    tests: makeTests(['2 2 5', '4 4 4', '\n', '1 2 3', '-1 -1 0 0'], r => line(r) || '\n', 129)
  },
  {
    num: 30, slug: 'common-numbers', title: 'Common Numbers', category: '05-sets-and-dictionaries', kind: 'numbers',
    learn: 'The & operator gives values shared by two sets. This example gives a set containing 2 and 3. A set has no required order, so use sorted() when the result must increase.',
    learnCode: 'left = {1, 2, 3}\nright = {2, 3, 4}\nprint(left & right)',
    task: 'Read two lines of space-separated integers. Print the integers that occur in both lines, once each, in increasing order. Separate results with spaces or new lines. If none is shared, print nothing.',
    examples: [{ input: '1 2 2 3\n2 3 4', output: '2 3' }, { input: '1 2\n3 4', output: '' }],
    starter: '# Read two lines of integers. Print their common values in order.\n',
    solution: 'left = [int(part) for part in input().split()]\nright = [int(part) for part in input().split()]\nanswer = sorted(set(left) & set(right))\nfor number in answer:\n    print(number)\n',
    java: 'Set<Integer> left = new HashSet<>(ints(nextLine()));\nSet<Integer> right = new HashSet<>(ints(nextLine()));\nleft.retainAll(right);\nList<Integer> answer = new ArrayList<>(left);\nCollections.sort(answer);\nreturn join(answer);',
    steps: ['Make a set from each list.', 'Use & to keep only values in both sets.', 'Sort and show the shared values.'],
    edge: 'If either line is blank, the result is empty.',
    hints: ['Make a set from each input line.', 'Find the values in both sets and sort them before printing.'],
    source: 'https://www.practicepython.org/exercise/2014/03/05/05-list-overlap.html',
    tests: makeTests(['1 2 2 3\n2 3 4', '1 2\n3 4', '\n\n', '-1 0\n-1', '5 5\n5 5'], r => `${line(r)}\n${line(r)}\n`, 130)
  },
  {
    num: 31, slug: 'count-a-word', title: 'Count a Word', category: '05-sets-and-dictionaries', kind: 'numbers',
    learn: 'A dictionary links a key to a value. Here, the key is a word and the value is its count.',
    learnCode: 'counts = {}\ncounts["cat"] = 2\nprint(counts["cat"])  # 2',
    task: 'Read one line of lower-case words separated by spaces. Read one target word from the next line. Print how many times the target word occurs in the first line. A missing word has a count of 0.',
    examples: [{ input: 'cat dog cat\ncat', output: '2' }, { input: 'red blue\ngreen', output: '0' }],
    starter: '# Read the words and target. Print the target word count.\n',
    solution: 'text = input()\ntarget = input()\ncounts = {}\nfor word in text.split():\n    counts[word] = counts.get(word, 0) + 1\nprint(counts.get(target, 0))\n',
    java: 'String text = nextLine().trim();\nString target = nextLine();\nint count = 0;\nif (!text.isEmpty()) for (String word : text.split("\\\\s+")) if (word.equals(target)) count++;\nreturn String.valueOf(count);',
    steps: ['Start an empty dictionary.', 'Visit each word and add 1 to its count.', 'Read the target count. Use 0 if the key is absent.'],
    edge: 'An empty first line has no words, so every target has count 0.',
    hints: ['Read the target after the line of words.', 'You can count matches directly or store a count for each word.'],
    source: 'https://exercism.org/tracks/python/exercises/word-count',
    tests: makeTests(['cat dog cat\ncat', 'red blue\ngreen', '\ncat', 'a a a\na', 'a b a\nb'], r => { const count = randomInt(r, 0, 12); const words = Array.from({ length: count }, () => name(r)); return `${words.join(' ')}\n${name(r)}\n`; }, 131)
  },
  {
    num: 32, slug: 'first-repeated-number', title: 'First Repeated Number', category: '05-sets-and-dictionaries', kind: 'numbers',
    learn: 'A set can tell you whether you saw a value before. Add each new value after you check it.',
    learnCode: 'seen = set()\nseen.add(4)\nprint(4 in seen)  # True',
    task: 'Read one line of space-separated integers from left to right. Print the first integer that you encounter for the second time. Print -1 if no integer repeats. A blank line gives -1.',
    examples: [{ input: '3 5 3 5', output: '3' }, { input: '1 2 3', output: '-1' }],
    starter: '# Read integers. Print the first repeated value, or -1.\n',
    solution: readList + 'seen = set()\nanswer = -1\nfor number in nums:\n    if number in seen:\n        answer = number\n        break\n    seen.add(number)\nprint(answer)\n',
    java: 'List<Integer> nums = ints(nextLine());\nSet<Integer> seen = new HashSet<>();\nfor (int value : nums) if (!seen.add(value)) return String.valueOf(value);\nreturn "-1";',
    steps: ['Start an empty seen set.', 'Check each number before you add it.', 'Stop at the first number already in seen.'],
    edge: 'An empty list or a list without repeats gives -1. The number -1 can itself repeat and is still a valid result.',
    hints: ['Keep a set of values already seen.', 'Check for a repeat before adding the current value to that set.'],
    tests: makeTests(['3 5 3 5', '1 2 3', '\n', '-1 2 -1', '4 4', '1 2 2 1'], r => line(r) || '\n', 132)
  },
  {
    num: 33, slug: 'look-up-a-score', title: 'Look Up a Score', category: '05-sets-and-dictionaries', kind: 'numbers',
    learn: 'A dictionary can store a score for each name. get(key, 0) returns 0 when a name is missing.',
    learnCode: 'scores = {"ada": 7}\nprint(scores.get("ada", 0))  # 7\nprint(scores.get("bea", 0))  # 0',
    task: 'Read a count from the first line. Read that many more lines. Each line has a lower-case name, a space, and an integer score. Names are unique. Read one query name after those lines. Print its score, or 0 if the name is absent.',
    examples: [{ input: '2\nada 7\nbea 4\nada', output: '7' }, { input: '1\nada 7\ncal', output: '0' }],
    starter: '# Read name-score lines and a query. Print its score, or 0.\n',
    solution: 'count = int(input())\nscores = {}\nfor _ in range(count):\n    parts = input().split()\n    name = parts[0]\n    score = int(parts[1])\n    scores[name] = score\nquery = input()\nprint(scores.get(query, 0))\n',
    java: 'int count = nextInt();\nMap<String, Integer> scores = new HashMap<>();\nfor (int i = 0; i < count; i++) { String[] parts = nextLine().split(" "); scores.put(parts[0], Integer.parseInt(parts[1])); }\nreturn String.valueOf(scores.getOrDefault(nextLine(), 0));',
    steps: ['Start an empty scores dictionary.', 'Store each name with its integer score.', 'Use get(query, 0) to find a score or 0.'],
    edge: 'A count of 0 makes an empty dictionary. Every query then gives 0.',
    hints: ['Store each name with its score in a dictionary.', 'After all scores, read the query and handle a missing name.'],
    source: 'https://www.practicepython.org/exercise/2017/01/24/33-birthday-dictionaries.html',
    tests: makeTests(['2\nada 7\nbea 4\nada', '1\nada 7\ncal', '0\nada', '1\nfox 0\nfox'], r => { const shuffled = [...names].sort(() => r() - 0.5); const count = randomInt(r, 0, names.length); const rows = shuffled.slice(0, count).map(n => `${n} ${randomInt(r, 0, 100)}`); return [count, ...rows, name(r)].join('\n'); }, 133)
  },
  {
    num: 34, slug: 'add-scores-by-name', title: 'Add Scores by Name', category: '05-sets-and-dictionaries', kind: 'numbers',
    learn: 'A dictionary can hold a total for each name. get(name, 0) reads that total or gives 0 when the name is missing. In the task, update a name each time another score appears.',
    learnCode: 'totals = {"ada": 3}\nprint(totals.get("ada", 0))\nprint(totals.get("bea", 0))',
    task: 'Read a count from the first line. Read that many more lines. Each line has a lower-case name, a space, and an integer score. A name may repeat. Add all scores for each name. Read one query name after the score lines. Print its total, or 0 if absent.',
    examples: [{ input: '3\nada 2\nbea 5\nada 4\nada', output: '6' }, { input: '1\nbea 5\nada', output: '0' }],
    starter: '# Read name-score lines and a query. Print the name total, or 0.\n',
    solution: 'count = int(input())\ntotals = {}\nfor _ in range(count):\n    parts = input().split()\n    name = parts[0]\n    score = int(parts[1])\n    totals[name] = totals.get(name, 0) + score\nquery = input()\nprint(totals.get(query, 0))\n',
    java: 'int count = nextInt();\nMap<String, Integer> totals = new HashMap<>();\nfor (int i = 0; i < count; i++) { String[] parts = nextLine().split(" "); totals.put(parts[0], totals.getOrDefault(parts[0], 0) + Integer.parseInt(parts[1])); }\nreturn String.valueOf(totals.getOrDefault(nextLine(), 0));',
    steps: ['Start an empty totals dictionary.', 'For each line, add the new score to the old total for that name.', 'Show the total for the query.'],
    edge: 'If a name does not appear, its total is 0. Scores can be negative.',
    hints: ['Store a running total for each name in a dictionary.', 'When a name first appears, its earlier total is 0.'],
    tests: makeTests(['3\nada 2\nbea 5\nada 4\nada', '1\nbea 5\nada', '0\nada', '2\nfox -2\nfox 3\nfox'], r => { const count = randomInt(r, 0, 12); const rows = Array.from({ length: count }, () => `${name(r)} ${randomInt(r, -10, 10)}`); return [count, ...rows, name(r)].join('\n'); }, 134)
  }
];
