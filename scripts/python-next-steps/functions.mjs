import { makeTests, randomInt } from './cases.mjs';

export const functions = [
  {
    num: 9, slug: 'square-function', title: 'Square Function', category: '02-functions', kind: 'numbers',
    learn: 'def gives a name to a group of code. return sends a value back. The code below the function calls it.',
    learnCode: 'def add_one(value):\n    return value + 1\n\nprint(add_one(4))  # 5',
    task: 'Complete square(number). It must return number * number. The final line is ready and shows the returned value. Inputs use -100 through 100.',
    examples: [{ input: '4', output: '16' }, { input: '-3', output: '9' }],
    starter: 'def square(number):\n    # Return the square.\n    return 0\n\nnumber = int(input())\nprint(square(number))\n',
    solution: 'def square(number):\n    return number * number\n\nnumber = int(input())\nprint(square(number))\n',
    java: 'int number = nextInt();\nreturn String.valueOf(number * number);',
    steps: ['The function receives number.', 'Multiply number by itself.', 'Return the result. The supplied call prints it.'],
    edge: 'A negative number squared gives a positive result. Zero gives zero.',
    hints: ['Use return inside the function.', 'Return number * number.'],
    tests: makeTests(['4', '-3', '0', '1', '-1', '100', '-100'], r => randomInt(r, -100, 100), 109)
  },
  {
    num: 10, slug: 'inside-a-range', title: 'Inside a Range', category: '02-functions', kind: 'numbers',
    learn: 'A function can receive more than one value. These values are its parameters. A result of 1 can mean yes, and 0 can mean no.',
    learnCode: 'def inside(value, low, high):\n    return low <= value <= high\n\nprint(inside(5, 1, 10))',
    task: 'Complete inside(value, low, high). Return 1 when value is from low through high, including both ends. Otherwise return 0. low is never greater than high.',
    examples: [{ input: '5\n1\n10', output: '1' }, { input: '11\n1\n10', output: '0' }],
    starter: 'def inside(value, low, high):\n    # Check both ends.\n    return 0\n\nvalue = int(input())\nlow = int(input())\nhigh = int(input())\nprint(inside(value, low, high))\n',
    solution: 'def inside(value, low, high):\n    if low <= value and value <= high:\n        return 1\n    return 0\n\nvalue = int(input())\nlow = int(input())\nhigh = int(input())\nprint(inside(value, low, high))\n',
    java: 'int value = nextInt();\nint low = nextInt();\nint high = nextInt();\nreturn low <= value && value <= high ? "1" : "0";',
    steps: ['Check that value is at least low.', 'Check that value is at most high.', 'Return 1 only when both checks are true.'],
    edge: 'A value equal to low or high is inside the range.',
    hints: ['Use low <= value and value <= high.', 'Return 1 or 0, not an English sentence.'],
    tests: makeTests(['5\n1\n10', '11\n1\n10', '1\n1\n10', '10\n1\n10', '-2\n-2\n-2'], r => { const a = randomInt(r, -50, 50); const b = randomInt(r, -50, 50); return `${randomInt(r, -60, 60)}\n${Math.min(a, b)}\n${Math.max(a, b)}`; }, 110)
  },
  {
    num: 11, slug: 'clamp-a-number', title: 'Clamp a Number', category: '02-functions', kind: 'numbers',
    learn: 'return ends a function. You can return early when a value is too small or too large.',
    learnCode: 'def at_least_zero(value):\n    if value < 0:\n        return 0\n    return value\n\nprint(at_least_zero(-3))',
    task: 'Complete clamp(value, low, high). Return low if value is below low. Return high if value is above high. Otherwise return value. low is never greater than high.',
    examples: [{ input: '15\n0\n10', output: '10' }, { input: '6\n0\n10', output: '6' }],
    starter: 'def clamp(value, low, high):\n    # Return the value inside the limits.\n    return value\n\nvalue = int(input())\nlow = int(input())\nhigh = int(input())\nprint(clamp(value, low, high))\n',
    solution: 'def clamp(value, low, high):\n    if value < low:\n        return low\n    if value > high:\n        return high\n    return value\n\nvalue = int(input())\nlow = int(input())\nhigh = int(input())\nprint(clamp(value, low, high))\n',
    java: 'int value = nextInt();\nint low = nextInt();\nint high = nextInt();\nreturn String.valueOf(Math.max(low, Math.min(value, high)));',
    steps: ['Check whether value is below low.', 'Check whether value is above high.', 'Return value when it is already inside the limits.'],
    edge: 'A value on a limit stays the same. A range with low = high always returns that one value.',
    hints: ['Return low when value < low.', 'Return high when value > high.'],
    tests: makeTests(['15\n0\n10', '6\n0\n10', '-5\n0\n10', '0\n0\n10', '10\n0\n10', '3\n3\n3'], r => { const a = randomInt(r, -50, 50); const b = randomInt(r, -50, 50); return `${randomInt(r, -60, 60)}\n${Math.min(a, b)}\n${Math.max(a, b)}`; }, 111)
  },
  {
    num: 12, slug: 'sum-a-range', title: 'Sum a Range', category: '02-functions', kind: 'numbers',
    learn: 'A function can use a loop and return its final total. The same function works for different inputs.',
    learnCode: 'def add_to_three():\n    total = 0\n    for number in range(1, 4):\n        total += number\n    return total\n\nprint(add_to_three())',
    task: 'Complete sum_range(start, end). Add every whole number from start through end. start is never greater than end. Values use -50 through 50.',
    examples: [{ input: '2\n4', output: '9' }, { input: '-2\n2', output: '0' }],
    starter: 'def sum_range(start, end):\n    total = 0\n    # Add every number in the range.\n    return total\n\nstart = int(input())\nend = int(input())\nprint(sum_range(start, end))\n',
    solution: 'def sum_range(start, end):\n    total = 0\n    for number in range(start, end + 1):\n        total += number\n    return total\n\nstart = int(input())\nend = int(input())\nprint(sum_range(start, end))\n',
    java: 'int start = nextInt();\nint end = nextInt();\nint total = 0;\nfor (int value = start; value <= end; value++) total += value;\nreturn String.valueOf(total);',
    steps: ['Start total at 0.', 'Loop from start through end.', 'Return total after the loop ends.'],
    edge: 'When start equals end, the answer is that one number.',
    hints: ['Use range(start, end + 1).', 'Return total after the loop.'],
    tests: makeTests(['2\n4', '-2\n2', '5\n5', '-5\n-3', '0\n0'], r => { const a = randomInt(r, -50, 50); const b = randomInt(r, -50, 50); return `${Math.min(a, b)}\n${Math.max(a, b)}`; }, 112)
  },
  {
    num: 13, slug: 'digit-count-function', title: 'Digit Count Function', category: '02-functions', kind: 'numbers',
    learn: 'A while loop can remove one digit at a time. The // sign divides and keeps only the whole-number part.',
    learnCode: 'number = 123\nnumber = number // 10\nprint(number)  # 12',
    task: 'Complete digit_count(number). Return the number of decimal digits. The number 0 has one digit. Inputs use 0 through 1,000,000.',
    examples: [{ input: '123', output: '3' }, { input: '0', output: '1' }],
    starter: 'def digit_count(number):\n    # Count the digits.\n    return 0\n\nnumber = int(input())\nprint(digit_count(number))\n',
    solution: 'def digit_count(number):\n    if number == 0:\n        return 1\n    count = 0\n    while number > 0:\n        count += 1\n        number //= 10\n    return count\n\nnumber = int(input())\nprint(digit_count(number))\n',
    java: 'int number = nextInt();\nif (number == 0) return "1";\nint count = 0;\nwhile (number > 0) { count++; number /= 10; }\nreturn String.valueOf(count);',
    steps: ['Return 1 for 0.', 'For other numbers, divide by 10 until no digits remain.', 'Count each division.'],
    edge: 'The special case for 0 stops the function from returning 0 digits.',
    hints: ['Handle 0 first.', 'Use number //= 10 inside the while loop.'],
    tests: makeTests(['123', '0', '9', '10', '99', '100', '1000000'], r => randomInt(r, 0, 1000000), 113)
  },
  {
    num: 14, slug: 'prime-check', title: 'Prime Check', category: '02-functions', kind: 'numbers',
    learn: 'A prime number has exactly two positive divisors: 1 and itself. Put the check in a function so you can use it again.',
    learnCode: 'print(7 % 2)  # 1: 2 does not divide 7',
    task: 'Complete is_prime(number). Return 1 for a prime number and 0 otherwise. Inputs use 0 through 500.',
    examples: [{ input: '7', output: '1' }, { input: '9', output: '0' }],
    starter: 'def is_prime(number):\n    # Check for another divisor.\n    return 0\n\nnumber = int(input())\nprint(is_prime(number))\n',
    solution: 'def is_prime(number):\n    if number < 2:\n        return 0\n    for divisor in range(2, number):\n        if number % divisor == 0:\n            return 0\n    return 1\n\nnumber = int(input())\nprint(is_prime(number))\n',
    java: 'int number = nextInt();\nif (number < 2) return "0";\nfor (int divisor = 2; divisor < number; divisor++) if (number % divisor == 0) return "0";\nreturn "1";',
    steps: ['Return 0 for numbers below 2.', 'Try possible divisors from 2 up to the number before number.', 'Return 0 if one divides evenly. Otherwise return 1.'],
    edge: 'Zero and 1 are not prime. The number 2 is prime because there are no divisors to try in the loop.',
    hints: ['Use number % divisor == 0 to find a divisor.', 'Try range(2, number).'],
    source: 'https://www.practicepython.org/exercise/2014/04/16/11-check-primality-functions.html',
    tests: makeTests(['7', '9', '0', '1', '2', '3', '4', '499', '500'], r => randomInt(r, 0, 500), 114)
  }
];
