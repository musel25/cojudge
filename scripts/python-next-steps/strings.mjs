import { makeTests, randomInt } from './cases.mjs';

const letters = 'abcdeiouXYZ';
const randomText = (random, maxLength = 12) => Array.from(
  { length: randomInt(random, 0, maxLength) },
  () => letters[randomInt(random, 0, letters.length - 1)]
).join('');
const words = ['sun', 'blue', 'cat', 'code', 'moon', 'red', 'tree', 'book'];
const randomPhrase = (random, maxWords = 6) => Array.from(
  { length: randomInt(random, 0, maxWords) },
  () => words[randomInt(random, 0, words.length - 1)]
).join(' ');

export const strings = [
  {
    num: 23, slug: 'first-two-letters', title: 'First Two Letters', category: '04-strings', kind: 'text',
    learn: 'A string slice selects characters from a start position up to, but not including, an end position. This example prints positions 1 and 2: yt. A slice can return fewer characters than requested.',
    learnCode: 'text = "python"\nprint(text[1:3])',
    task: 'Read one line of text. Print its first two characters. If the line has fewer than two characters, print all that it has. Keep the original letter case.',
    examples: [{ input: 'python', output: 'py' }, { input: 'A', output: 'A' }],
    starter: '# Read one line of text. Print at most its first two characters.\n',
    solution: 'text = input()\nprint(text[:2])\n',
    java: 'String text = nextLine();\nint end = text.offsetByCodePoints(0, Math.min(2, text.codePointCount(0, text.length())));\nreturn text.substring(0, end);',
    steps: ['Read the text.', 'Use [:2] to take its first two characters.', 'Show that slice.'],
    edge: 'A short or empty string does not cause an index error with a slice.',
    hints: ['The first character is at position 0.', 'A slice can stop before position 2 without an error on short text.'],
    source: 'https://codingbat.com/python/String-1',
    tests: makeTests(['python', 'A', '\n', 'ab', 'ABC', 'é', 'hello world'], r => randomText(r) || '\n', 123)
  },
  {
    num: 24, slug: 'reverse-text', title: 'Reverse Text', category: '04-strings', kind: 'text',
    learn: 'A slice with step -1 reads a sequence from its end to its start. This example reverses a list of letters. The task asks you to reverse a whole string, including spaces.',
    learnCode: 'letters = ["c", "a", "t"]\nprint(letters[::-1])',
    task: 'Read one line of text. Print all its characters in reverse order. Keep every space and the original letter case. An empty line gives an empty line of output.',
    examples: [{ input: 'cat', output: 'tac' }, { input: 'A b', output: 'b A' }],
    starter: '# Read one line of text. Print its characters in reverse order.\n',
    solution: 'text = input()\nprint(text[::-1])\n',
    java: 'String text = nextLine();\nreturn new StringBuilder(text).reverse().toString();',
    steps: ['Read the text.', 'Use [::-1] to make a reversed copy.', 'Show the copy.'],
    edge: 'An empty line stays empty. Spaces also move when the text reverses.',
    hints: ['A string can use the same reverse slice as a list.', 'Reverse the whole line so spaces move with the other characters.'],
    source: 'https://exercism.org/tracks/python/exercises/reverse-string',
    tests: makeTests(['cat', 'A b', '\n', 'a', 'abba', 'Hello', 'a  b', '  a'], r => randomText(r) || '\n', 124),
    rejections: [{ input: '  a', output: 'a' }]
  },
  {
    num: 25, slug: 'count-vowels', title: 'Count Vowels', category: '04-strings', kind: 'numbers',
    learn: 'lower() changes big letters to small letters. Use in to check whether one character is in a group.',
    learnCode: 'letter = "A"\nprint(letter.lower() in "aeiou")  # True',
    task: 'Read one line of text. Count the letters a, e, i, o, and u. Count upper-case and lower-case letters. Print the count. Other characters do not count.',
    examples: [{ input: 'Apple', output: '2' }, { input: 'sky', output: '0' }],
    starter: '# Read one line of text. Print its vowel count.\n',
    solution: 'text = input()\ncount = 0\nfor letter in text.lower():\n    if letter in "aeiou":\n        count += 1\nprint(count)\n',
    java: 'String text = nextLine().toLowerCase(Locale.ROOT);\nint count = 0;\nfor (char letter : text.toCharArray()) if ("aeiou".indexOf(letter) >= 0) count++;\nreturn String.valueOf(count);',
    steps: ['Change the text to lower case.', 'Visit each letter.', 'Count it when it is in aeiou.'],
    edge: 'A line without vowels, including an empty line, gives 0.',
    hints: ['Visit each character.', 'Compare lower-case versions so A and a both count.'],
    tests: makeTests(['Apple', 'sky', '\n', 'AEIOU', 'a e i o u', 'Python', 'queue'], r => randomText(r) || '\n', 125)
  },
  {
    num: 26, slug: 'different-positions', title: 'Different Positions', category: '04-strings', kind: 'numbers',
    learn: 'Two strings have a character at each position. Compare the characters at the same index.',
    learnCode: 'first = "cat"\nsecond = "car"\nprint(first[2] != second[2])  # True',
    task: 'Read two lines of text. They always have the same length. Count positions where the characters on the two lines differ. Print the count. Upper-case and lower-case letters are different.',
    examples: [{ input: 'cat\ncar', output: '1' }, { input: 'abc\nabc', output: '0' }],
    starter: '# Read two equal-length lines. Count positions that differ.\n',
    solution: 'first = input()\nsecond = input()\ncount = 0\nfor index in range(len(first)):\n    if first[index] != second[index]:\n        count += 1\nprint(count)\n',
    java: 'int[] first = nextLine().codePoints().toArray();\nint[] second = nextLine().codePoints().toArray();\nint count = 0;\nfor (int i = 0; i < first.length; i++) if (first[i] != second[i]) count++;\nreturn String.valueOf(count);',
    steps: ['Start count at 0.', 'Visit each position in the first string.', 'Add 1 when the two characters at that position differ.'],
    edge: 'Two empty strings have 0 different positions.',
    hints: ['Compare characters at the same position.', 'A comparison at each position can add 1 to a count.'],
    source: 'https://exercism.org/tracks/python/exercises/hamming',
    tests: makeTests(['cat\ncar', 'abc\nabc', '\n\n', 'A\na', 'abcd\nwxyz'], r => { const first = randomText(r, 10); const second = Array.from({ length: first.length }, () => letters[randomInt(r, 0, letters.length - 1)]).join(''); return `${first}\n${second}\n`; }, 126)
  },
  {
    num: 27, slug: 'count-words', title: 'Count Words', category: '04-strings', kind: 'numbers',
    learn: 'split() separates a line at whitespace. Repeated spaces do not make empty words. This example makes a list with red and blue. len() counts the items in a list.',
    learnCode: 'words = "red   blue".split()\nprint(words)',
    task: 'Read one line of text. Count its words and print the count. Spaces separate words. Extra spaces do not make extra words. A blank line gives 0.',
    examples: [{ input: 'red blue green', output: '3' }, { input: '  one   two', output: '2' }],
    starter: '# Read one line of text. Print its word count.\n',
    solution: 'text = input()\nwords = text.split()\nprint(len(words))\n',
    java: 'String text = nextLine().trim();\nreturn String.valueOf(text.isEmpty() ? 0 : text.split("\\\\s+").length);',
    steps: ['Use split() to make a list of words.', 'Use len() to count the list items.', 'Show the count.'],
    edge: 'An empty line or a line with only spaces has 0 words.',
    hints: ['Split the line into words.', 'Count the items in the resulting list.'],
    tests: makeTests(['red blue green', '  one   two  ', '\n', 'word', '   ', 'a b c d'], r => { const phrase = randomPhrase(r); return phrase || '\n'; }, 127)
  },
  {
    num: 28, slug: 'make-an-acronym', title: 'Make an Acronym', category: '04-strings', kind: 'text',
    learn: 'The first letter of each word can make a short name. upper() makes those letters capitals.',
    learnCode: 'word = "cat"\nprint(word[0].upper())  # C',
    task: 'Read one line of words separated by spaces. Take the first letter of each word. Print those letters together in upper case, with no spaces. Words contain only English letters. A blank line gives an empty line.',
    examples: [{ input: 'portable network graphics', output: 'PNG' }, { input: 'Blue sky', output: 'BS' }],
    starter: '# Read words. Print their first letters together in upper case.\n',
    solution: 'text = input()\nletters = []\nfor word in text.split():\n    letters.append(word[0].upper())\nprint("".join(letters))\n',
    java: 'String text = nextLine().trim();\nif (text.isEmpty()) return "";\nStringBuilder answer = new StringBuilder();\nfor (String word : text.split("\\\\s+")) answer.append(Character.toUpperCase(word.charAt(0)));\nreturn answer.toString();',
    steps: ['Use split() to get the words.', 'Take index 0 of each word and make it upper case.', 'Join the letters with no spaces.'],
    edge: 'A blank line has no words, so its acronym is empty.',
    hints: ['Split the line into words.', 'Take the first character of each word and change it to upper case.'],
    source: 'https://exercism.org/tracks/python/exercises/acronym',
    tests: makeTests(['portable network graphics', 'Blue sky', '\n', 'one', '  red   apple  ', 'a b c'], r => { const phrase = randomPhrase(r); return phrase || '\n'; }, 128)
  }
];
