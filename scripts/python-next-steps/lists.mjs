import { makeTests, numberLine, randomInt, randomNumbers } from './cases.mjs';

const listTests = (base, seed, options) => makeTests(base, r => numberLine(randomNumbers(r, options)) || '\n', seed);
const readList = 'nums = []\nfor part in input().split():\n    nums.append(int(part))\n';

export const lists = [
  {
    num: 15, slug: 'first-and-last', title: 'First and Last', category: '03-lists', kind: 'numbers',
    learn: 'split() separates one line of text into parts. List positions start at 0. Position -1 selects the last item. In the task, change each part into an integer before you print the first and last values.',
    learnCode: 'nums = [4, 8, 3]\nprint(nums[0], nums[-1])  # 4 3',
    task: 'Read one line of space-separated integers. Print the first integer and the last integer. Separate them with a space or a new line. The line always contains at least one integer.',
    examples: [{ input: '4 8 3', output: '4 3' }, { input: '7', output: '7 7' }],
    starter: '# Read a line of integers. Print its first and last values.\n',
    solution: readList + 'print(nums[0], nums[-1])\n',
    java: 'List<Integer> nums = ints(nextLine());\nreturn nums.get(0) + " " + nums.get(nums.size() - 1);',
    steps: ['Read one line and change its parts into integers.', 'Use position 0 for the first value.', 'Use position -1 for the last value and print both.'],
    edge: 'A one-item list has the same first and last value.',
    hints: ['Split the input line into parts and change them to integers.', 'Use the first and last list positions.'],
    source: 'https://www.practicepython.org/exercise/2014/04/25/12-list-ends.html',
    tests: listTests(['4 8 3', '7', '-2 0 5', '1 2', '0'], 115, { minLength: 1 })
  },
  {
    num: 16, slug: 'sum-positive-values', title: 'Sum Positive Values', category: '03-lists', kind: 'numbers',
    learn: 'A for loop can visit each item in a list. Use if to choose the items that count.',
    learnCode: 'nums = [3, -2, 5]\nfor number in nums:\n    print(number)',
    task: 'Read one line of space-separated integers. Add only the integers greater than 0. Print the sum. A blank line is an empty list and gives 0.',
    examples: [{ input: '3 -2 5', output: '8' }, { input: '-4 0', output: '0' }],
    starter: '# Read a line of integers. Print the sum of its positive values.\n',
    solution: readList + 'total = 0\nfor number in nums:\n    if number > 0:\n        total += number\nprint(total)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint total = 0;\nfor (int value : nums) if (value > 0) total += value;\nreturn String.valueOf(total);',
    steps: ['Start total at 0.', 'Visit every item in nums.', 'Add an item only when it is greater than 0.'],
    edge: 'A blank list and a list without positive values both give 0.',
    hints: ['Split the line and change each part into an integer.', 'Add a value only when it is greater than 0.'],
    tests: listTests(['3 -2 5', '-4 0', '\n', '0 0 0', '1', '-1 1'], 116)
  },
  {
    num: 17, slug: 'keep-small-values', title: 'Keep Small Values', category: '03-lists', kind: 'numbers',
    learn: 'append adds one item to the end of a list. Build a new list when you want to keep only some items.',
    learnCode: 'small = []\nsmall.append(2)\nprint(small)  # [2]',
    task: 'Read one line of space-separated integers. Read the limit from the next line. Print each integer that is smaller than the limit, in its original order. Separate results with spaces or new lines. If none qualifies, print nothing.',
    examples: [{ input: '8 2 5 1\n5', output: '2 1' }, { input: '7 8\n3', output: '' }],
    starter: '# Read the integers and limit. Print values below the limit in order.\n',
    solution: readList + 'limit = int(input())\nanswer = []\nfor number in nums:\n    if number < limit:\n        answer.append(number)\nfor number in answer:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint limit = nextInt();\nList<Integer> answer = new ArrayList<>();\nfor (int value : nums) if (value < limit) answer.add(value);\nreturn join(answer);',
    steps: ['Start an empty answer list.', 'Visit each input number.', 'Append it only when it is below limit.'],
    edge: 'A value equal to the limit does not qualify. An empty answer prints no numbers.',
    hints: ['Read the list before you read the limit.', 'Keep a value only when it is strictly smaller than the limit.'],
    source: 'https://www.practicepython.org/exercise/2014/02/15/03-list-less-than-ten.html',
    tests: makeTests(['8 2 5 1\n5', '7 8\n3', '\n5', '-2 -5 0\n0', '5 5\n5'], r => `${numberLine(randomNumbers(r))}\n${randomInt(r, -20, 20)}`, 117)
  },
  {
    num: 18, slug: 'rotate-three-values', title: 'Rotate Three Values', category: '03-lists', kind: 'numbers',
    learn: 'A list keeps its order. You can use indexes to place items in a new order.',
    learnCode: 'values = [5, 8, 2]\nprint(values[1])  # 8',
    task: 'Read one line with exactly three space-separated integers. Move the first integer to the end. Print the three integers in their new order, separated by spaces or new lines. For 5 8 2, print 8 2 5.',
    examples: [{ input: '5 8 2', output: '8 2 5' }, { input: '1 1 1', output: '1 1 1' }],
    starter: '# Read three integers. Move the first to the end and print them.\n',
    solution: readList + 'print(nums[1], nums[2], nums[0])\n',
    java: 'List<Integer> nums = ints(nextLine());\nreturn nums.get(1) + " " + nums.get(2) + " " + nums.get(0);',
    steps: ['Read the three values into nums.', 'Get the second and third values with indexes 1 and 2.', 'Show the first value last.'],
    edge: 'Equal values stay equal. The positions still move.',
    hints: ['Split the input line into three values.', 'List positions 1 and 2 come before position 0 in the result.'],
    source: 'https://codingbat.com/python/List-1',
    tests: makeTests(['5 8 2', '1 1 1', '0 -1 2', '9 0 9'], r => numberLine(Array.from({ length: 3 }, () => randomInt(r, -20, 20))), 118)
  },
  {
    num: 19, slug: 'running-totals', title: 'Running Totals', category: '03-lists', kind: 'numbers',
    learn: 'A running total changes after each value. This example prints 4 after the first value and 3 after the second. The task asks you to read the values from input and show every new total.',
    learnCode: 'total = 0\nfor value in [4, -1]:\n    total += value\n    print(total)',
    task: 'Read one line of space-separated integers. Print the total after each integer, in input order. Separate totals with spaces or new lines. For 2 3 -1, print 2 5 4. A blank line gives no output.',
    examples: [{ input: '2 3 -1', output: '2 5 4' }, { input: '\n', output: '' }],
    starter: '# Read a line of integers. Print the total after each one.\n',
    solution: readList + 'totals = []\ntotal = 0\nfor number in nums:\n    total += number\n    totals.append(total)\nfor number in totals:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nList<Integer> totals = new ArrayList<>();\nint total = 0;\nfor (int value : nums) { total += value; totals.add(total); }\nreturn join(totals);',
    steps: ['Start total at 0 and totals as an empty list.', 'Add each number to total.', 'Append the new total to totals.'],
    edge: 'A blank input has no numbers. The answer list stays empty.',
    hints: ['Start a total at 0.', 'After you add each value, show the new total.'],
    source: 'https://exercism.org/tracks/python/exercises/accumulate',
    tests: listTests(['2 3 -1', '\n', '5', '0 0 0', '-2 2 -2'], 119)
  },
  {
    num: 20, slug: 'count-increases', title: 'Count Increases', category: '03-lists', kind: 'numbers',
    learn: 'Compare each item with the item before it. len(nums) gives the number of items. Start at index 1 because index 0 has no item before it.',
    learnCode: 'nums = [2, 5, 4]\nprint(nums[1] > nums[0])  # True',
    task: 'Read one line of space-separated integers. Count each integer that is greater than the integer immediately before it. Print the count. A blank line or a line with one integer gives 0.',
    examples: [{ input: '2 5 4 7', output: '2' }, { input: '8', output: '0' }],
    starter: '# Read a line of integers. Count increases between neighbors.\n',
    solution: readList + 'count = 0\nfor index in range(1, len(nums)):\n    if nums[index] > nums[index - 1]:\n        count += 1\nprint(count)\n',
    java: 'List<Integer> nums = ints(nextLine());\nint count = 0;\nfor (int i = 1; i < nums.size(); i++) if (nums.get(i) > nums.get(i - 1)) count++;\nreturn String.valueOf(count);',
    steps: ['Start the index at 1.', 'Compare nums[index] with nums[index - 1].', 'Count only strict increases.'],
    edge: 'Equal neighbors do not count. Empty and one-item lists have no neighboring pair.',
    hints: ['The first item has no previous item.', 'Compare each later item with the one just before it.'],
    tests: listTests(['2 5 4 7', '8', '\n', '1 1 1', '3 2 1', '-3 -2 -1'], 120)
  },
  {
    num: 21, slug: 'reverse-a-list', title: 'Reverse a List', category: '03-lists', kind: 'numbers',
    learn: 'A slice with step -1 makes a list in reverse order. This example changes ["a", "b", "c"] to ["c", "b", "a"]. In the task, read integers and print them without list brackets.',
    learnCode: 'letters = ["a", "b", "c"]\nprint(letters[::-1])',
    task: 'Read one line of space-separated integers. Print them in reverse order, separated by spaces or new lines. A blank line gives no output.',
    examples: [{ input: '4 8 3', output: '3 8 4' }, { input: '\n', output: '' }],
    starter: '# Read a line of integers. Print them in reverse order.\n',
    solution: readList + 'backward = nums[::-1]\nfor number in backward:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nCollections.reverse(nums);\nreturn join(nums);',
    steps: ['Read one line and change its parts into integers.', 'Use nums[::-1] to make a backward copy.', 'Show each number in that copy.'],
    edge: 'Reversing an empty list still gives an empty list.',
    hints: ['Split the line and change its parts into integers.', 'You can visit a list from its last item to its first.'],
    source: 'https://codingbat.com/python/List-1',
    tests: listTests(['4 8 3', '\n', '7', '1 1 2', '-2 0 3'], 121)
  },
  {
    num: 22, slug: 'square-a-list', title: 'Square a List', category: '03-lists', kind: 'numbers',
    learn: 'A list comprehension makes a new list. This example doubles each value in [2, 3] and gives [4, 6]. In the task, make a new value by multiplying each number by itself.',
    learnCode: 'values = [2, 3]\ndoubled = [value * 2 for value in values]\nprint(doubled)',
    task: 'Read one line of space-separated integers. Print the square of each integer in the same order, separated by spaces or new lines. A blank line gives no output.',
    examples: [{ input: '2 -3 0', output: '4 9 0' }, { input: '\n', output: '' }],
    starter: '# Read a line of integers. Print each square in the same order.\n',
    solution: readList + 'squares = [number * number for number in nums]\nfor number in squares:\n    print(number)\n',
    java: 'List<Integer> nums = ints(nextLine());\nList<Integer> squares = new ArrayList<>();\nfor (int value : nums) squares.add(value * value);\nreturn join(squares);',
    steps: ['Read the numbers into nums.', 'Build a new list with one square per number.', 'Show each square.'],
    edge: 'A negative number has a positive square. An empty input gives no numbers.',
    hints: ['First read the integers from the line.', 'The square of a number is that number multiplied by itself.'],
    tests: listTests(['2 -3 0', '\n', '5', '-1 1', '0 0 0'], 122)
  }
];
