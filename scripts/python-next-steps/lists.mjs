import { makeTests, numberLine, randomInt, randomNumbers } from './cases.mjs';

const listTests = (base, seed, options) => makeTests(base, r => numberLine(randomNumbers(r, options)) || '\n', seed);
const readList = 'nums = []\nfor part in input().split():\n    nums.append(int(part))\n';

export const lists = [
  {
    num: 15, slug: 'first-and-last', title: 'First and Last', category: '03-lists', kind: 'numbers',
    learn: 'split() makes a list of the words in one input line. The starter changes each word to an integer. List positions start at 0. Position -1 means the last item.',
    learnCode: 'nums = [4, 8, 3]\nprint(nums[0], nums[-1])  # 4 3',
    task: 'Read one line of numbers. Show the first and last number. The line always has at least one number. The starter reads the list for you.',
    examples: [{ input: '4 8 3', output: '4 3' }, { input: '7', output: '7 7' }],
    starter: readList + '# Show the first and last values.\n',
    solution: readList + 'print(nums[0], nums[-1])\n',
    java: 'List<Integer> nums = ints(nextLine());\nreturn nums.get(0) + " " + nums.get(nums.size() - 1);',
    steps: ['The starter builds nums.', 'Use nums[0] for the first value.', 'Use nums[-1] for the last value.'],
    edge: 'A one-item list has the same first and last value.',
    hints: ['Use nums[0].', 'Use nums[-1] for the last item.'],
    source: 'https://www.practicepython.org/exercise/2014/04/25/12-list-ends.html',
    tests: listTests(['4 8 3', '7', '-2 0 5', '1 2', '0'], 115, { minLength: 1 })
  },
  {
    num: 16, slug: 'sum-positive-values', title: 'Sum Positive Values', category: '03-lists', kind: 'numbers',
    learn: 'A for loop can visit each item in a list. Use if to choose the items that count.',
    learnCode: 'nums = [3, -2, 5]\nfor number in nums:\n    print(number)',
    task: 'Read one line of numbers. Add only numbers greater than 0. Show the sum. A blank line is an empty list.',
    examples: [{ input: '3 -2 5', output: '8' }, { input: '-4 0', output: '0' }],
    starter: readList + 'total = 0\n# Add positive values.\nprint(total)\n',
    solution: readList + 'total = 0\nfor number in nums:\n    if number > 0:\n        total += number\nprint(total)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint total = 0;\nfor (int value : nums) if (value > 0) total += value;\nreturn String.valueOf(total);',
    steps: ['Start total at 0.', 'Visit every item in nums.', 'Add an item only when it is greater than 0.'],
    edge: 'A blank list and a list without positive values both give 0.',
    hints: ['Loop with for number in nums:.', 'Check number > 0.'],
    tests: listTests(['3 -2 5', '-4 0', '\n', '0 0 0', '1', '-1 1'], 116)
  },
  {
    num: 17, slug: 'keep-small-values', title: 'Keep Small Values', category: '03-lists', kind: 'numbers',
    learn: 'append adds one item to the end of a list. Build a new list when you want to keep only some items.',
    learnCode: 'small = []\nsmall.append(2)\nprint(small)  # [2]',
    task: 'Read a line of numbers, then a limit on the next line. Keep values below the limit. Keep their original order. Show the kept numbers. Show nothing if none qualify.',
    examples: [{ input: '8 2 5 1\n5', output: '2 1' }, { input: '7 8\n3', output: '' }],
    starter: readList + 'limit = int(input())\nanswer = []\n# Add values below limit.\nfor number in answer:\n    print(number)\n',
    solution: readList + 'limit = int(input())\nanswer = []\nfor number in nums:\n    if number < limit:\n        answer.append(number)\nfor number in answer:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint limit = nextInt();\nList<Integer> answer = new ArrayList<>();\nfor (int value : nums) if (value < limit) answer.add(value);\nreturn join(answer);',
    steps: ['Start an empty answer list.', 'Visit each input number.', 'Append it only when it is below limit.'],
    edge: 'A value equal to the limit does not qualify. An empty answer prints no numbers.',
    hints: ['Use if number < limit:.', 'Call answer.append(number).'],
    source: 'https://www.practicepython.org/exercise/2014/02/15/03-list-less-than-ten.html',
    tests: makeTests(['8 2 5 1\n5', '7 8\n3', '\n5', '-2 -5 0\n0', '5 5\n5'], r => `${numberLine(randomNumbers(r))}\n${randomInt(r, -20, 20)}`, 117)
  },
  {
    num: 18, slug: 'rotate-three-values', title: 'Rotate Three Values', category: '03-lists', kind: 'numbers',
    learn: 'A list keeps its order. You can use indexes to place items in a new order.',
    learnCode: 'values = [5, 8, 2]\nprint(values[1])  # 8',
    task: 'Read exactly three numbers. Move the first number to the end. Show the new order. For 5 8 2, show 8 2 5.',
    examples: [{ input: '5 8 2', output: '8 2 5' }, { input: '1 1 1', output: '1 1 1' }],
    starter: readList + '# Show item 1, item 2, then item 0.\n',
    solution: readList + 'print(nums[1], nums[2], nums[0])\n',
    java: 'List<Integer> nums = ints(nextLine());\nreturn nums.get(1) + " " + nums.get(2) + " " + nums.get(0);',
    steps: ['Read the three values into nums.', 'Get the second and third values with indexes 1 and 2.', 'Show the first value last.'],
    edge: 'Equal values stay equal. The positions still move.',
    hints: ['Python list indexes start at 0.', 'Use nums[1], nums[2], nums[0].'],
    source: 'https://codingbat.com/python/List-1',
    tests: makeTests(['5 8 2', '1 1 1', '0 -1 2', '9 0 9'], r => numberLine(Array.from({ length: 3 }, () => randomInt(r, -20, 20))), 118)
  },
  {
    num: 19, slug: 'running-totals', title: 'Running Totals', category: '03-lists', kind: 'numbers',
    learn: 'A running total changes after each item. Append each new total to an answer list.',
    learnCode: 'total = 0\nfor number in [2, 3]:\n    total += number\n    print(total)  # 2, then 5',
    task: 'Read one line of numbers. Show the total after each number. For 2 3 -1, show 2 5 4. A blank line gives no output.',
    examples: [{ input: '2 3 -1', output: '2 5 4' }, { input: '\n', output: '' }],
    starter: readList + 'totals = []\ntotal = 0\n# Build running totals.\nfor number in totals:\n    print(number)\n',
    solution: readList + 'totals = []\ntotal = 0\nfor number in nums:\n    total += number\n    totals.append(total)\nfor number in totals:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nList<Integer> totals = new ArrayList<>();\nint total = 0;\nfor (int value : nums) { total += value; totals.add(total); }\nreturn join(totals);',
    steps: ['Start total at 0 and totals as an empty list.', 'Add each number to total.', 'Append the new total to totals.'],
    edge: 'A blank input has no numbers. The answer list stays empty.',
    hints: ['Change total inside the loop.', 'Append total after each addition.'],
    source: 'https://exercism.org/tracks/python/exercises/accumulate',
    tests: listTests(['2 3 -1', '\n', '5', '0 0 0', '-2 2 -2'], 119)
  },
  {
    num: 20, slug: 'count-increases', title: 'Count Increases', category: '03-lists', kind: 'numbers',
    learn: 'Compare each item with the item before it. len(nums) gives the number of items. Start at index 1 because index 0 has no item before it.',
    learnCode: 'nums = [2, 5, 4]\nprint(nums[1] > nums[0])  # True',
    task: 'Read one line of numbers. Count how many values are greater than the value just before them. A blank or one-item list gives 0.',
    examples: [{ input: '2 5 4 7', output: '2' }, { input: '8', output: '0' }],
    starter: readList + 'count = 0\n# Compare neighboring items.\nprint(count)\n',
    solution: readList + 'count = 0\nfor index in range(1, len(nums)):\n    if nums[index] > nums[index - 1]:\n        count += 1\nprint(count)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint count = 0;\nfor (int i = 1; i < nums.size(); i++) if (nums.get(i) > nums.get(i - 1)) count++;\nreturn String.valueOf(count);',
    steps: ['Start the index at 1.', 'Compare nums[index] with nums[index - 1].', 'Count only strict increases.'],
    edge: 'Equal neighbors do not count. Empty and one-item lists have no neighboring pair.',
    hints: ['Loop over range(1, len(nums)).', 'Check nums[index] > nums[index - 1].'],
    tests: listTests(['2 5 4 7', '8', '\n', '1 1 1', '3 2 1', '-3 -2 -1'], 120)
  },
  {
    num: 21, slug: 'reverse-a-list', title: 'Reverse a List', category: '03-lists', kind: 'numbers',
    learn: 'A slice with step -1 reads a list backward. It makes a new list.',
    learnCode: 'nums = [4, 8, 3]\nbackward = nums[::-1]\nprint(backward)  # [3, 8, 4]',
    task: 'Read one line of numbers. Show them in reverse order. A blank line gives no output.',
    examples: [{ input: '4 8 3', output: '3 8 4' }, { input: '\n', output: '' }],
    starter: readList + '# Make a reversed list.\n',
    solution: readList + 'backward = nums[::-1]\nfor number in backward:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nCollections.reverse(nums);\nreturn join(nums);',
    steps: ['The starter reads the list.', 'Use nums[::-1] to make a backward copy.', 'Show each number in that copy.'],
    edge: 'Reversing an empty list still gives an empty list.',
    hints: ['Use nums[::-1].', 'Loop through the reversed list to print it.'],
    source: 'https://codingbat.com/python/List-1',
    tests: listTests(['4 8 3', '\n', '7', '1 1 2', '-2 0 3'], 121)
  },
  {
    num: 22, slug: 'square-a-list', title: 'Square a List', category: '03-lists', kind: 'numbers',
    learn: 'A list comprehension makes a new list from old items. Read it as: make number * number for each number in nums.',
    learnCode: 'nums = [2, 3]\nsquares = [number * number for number in nums]\nprint(squares)  # [4, 9]',
    task: 'Read one line of numbers. Show the square of each number in the same order. A blank line gives no output.',
    examples: [{ input: '2 -3 0', output: '4 9 0' }, { input: '\n', output: '' }],
    starter: readList + '# Make a list of squares.\n',
    solution: readList + 'squares = [number * number for number in nums]\nfor number in squares:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nList<Integer> squares = new ArrayList<>();\nfor (int value : nums) squares.add(value * value);\nreturn join(squares);',
    steps: ['Read the numbers into nums.', 'Build a new list with one square per number.', 'Show each square.'],
    edge: 'A negative number has a positive square. An empty input gives no numbers.',
    hints: ['Use [number * number for number in nums].', 'Show the result list with a loop.'],
    tests: listTests(['2 -3 0', '\n', '5', '-1 1', '0 0 0'], 122)
  }
];
