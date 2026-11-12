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
    learn: 'A string is a sequence of characters. A slice such as text[:2] takes at most the first two characters.',
    learnCode: 'text = "python"\nprint(text[:2])  # py',
    task: 'Read one line of text. Show its first two characters. If it has fewer than two, show what it has. Letter case stays the same.',
    spanish: 'Lee una línea de texto. Muestra sus primeros dos caracteres, o los que existan.',
    examples: [{ input: 'python', output: 'py' }, { input: 'A', output: 'A' }],
    starter: 'text = input()\n# Show at most two characters.\n',
    solution: 'text = input()\nprint(text[:2])\n',
    java: 'String text = nextLine();\nint end = text.offsetByCodePoints(0, Math.min(2, text.codePointCount(0, text.length())));\nreturn text.substring(0, end);',
    steps: ['Read the text.', 'Use [:2] to take its first two characters.', 'Show that slice.'],
    edge: 'A short or empty string does not cause an index error with a slice.',
    hints: ['Use text[:2].', 'A slice can be shorter than the number requested.'],
    source: 'https://codingbat.com/python/String-1',
    tests: makeTests(['python', 'A', '\n', 'ab', 'ABC', 'é', 'hello world'], r => randomText(r) || '\n', 123)
  },
  {
    num: 24, slug: 'reverse-text', title: 'Reverse Text', category: '04-strings', kind: 'text',
    learn: 'A string slice with step -1 reads characters from the end to the start. Keep spaces and letter case.',
    learnCode: 'text = "cat"\nprint(text[::-1])  # tac',
    task: 'Read one line of text. Show its characters in reverse order. Keep every space and the original letter case.',
    spanish: 'Lee una línea. Muestra sus caracteres en orden inverso. Conserva espacios y mayúsculas.',
    examples: [{ input: 'cat', output: 'tac' }, { input: 'A b', output: 'b A' }],
    starter: 'text = input()\n# Show the text backward.\n',
    solution: 'text = input()\nprint(text[::-1])\n',
    java: 'String text = nextLine();\nreturn new StringBuilder(text).reverse().toString();',
    steps: ['Read the text.', 'Use [::-1] to make a reversed copy.', 'Show the copy.'],
    edge: 'An empty line stays empty. Spaces also move when the text reverses.',
    hints: ['Use text[::-1].', 'Do not change letter case.'],
    source: 'https://exercism.org/tracks/python/exercises/reverse-string',
    tests: makeTests(['cat', 'A b', '\n', 'a', 'abba', 'Hello', 'a  b', '  a'], r => randomText(r) || '\n', 124),
    rejections: [{ input: '  a', output: 'a' }]
  },
  {
    num: 25, slug: 'count-vowels', title: 'Count Vowels', category: '04-strings', kind: 'numbers',
    learn: 'lower() changes big letters to small letters. Use in to check whether one character is in a group.',
    learnCode: 'letter = "A"\nprint(letter.lower() in "aeiou")  # True',
    task: 'Read one line of text. Count the letters a, e, i, o, and u. Count big and small letters. Show the count.',
    spanish: 'Cuenta las letras a, e, i, o y u. Cuenta mayúsculas y minúsculas.',
    examples: [{ input: 'Apple', output: '2' }, { input: 'sky', output: '0' }],
    starter: 'text = input()\ncount = 0\n# Count the vowels.\nprint(count)\n',
    solution: 'text = input()\ncount = 0\nfor letter in text.lower():\n    if letter in "aeiou":\n        count += 1\nprint(count)\n',
    java: 'String text = nextLine().toLowerCase(Locale.ROOT);\nint count = 0;\nfor (char letter : text.toCharArray()) if ("aeiou".indexOf(letter) >= 0) count++;\nreturn String.valueOf(count);',
    steps: ['Change the text to lower case.', 'Visit each letter.', 'Count it when it is in aeiou.'],
    edge: 'A line without vowels, including an empty line, gives 0.',
    hints: ['Use text.lower().', 'Check if letter in "aeiou".'],
    tests: makeTests(['Apple', 'sky', '\n', 'AEIOU', 'a e i o u', 'Python', 'queue'], r => randomText(r) || '\n', 125)
  },
  {
    num: 26, slug: 'different-positions', title: 'Different Positions', category: '04-strings', kind: 'numbers',
    learn: 'Two strings have a character at each position. Compare the characters at the same index.',
    learnCode: 'first = "cat"\nsecond = "car"\nprint(first[2] != second[2])  # True',
    task: 'Read two lines of text with the same length. Count positions where their characters differ. Big and small letters are different.',
    spanish: 'Lee dos textos de igual longitud. Cuenta las posiciones con caracteres diferentes.',
    examples: [{ input: 'cat\ncar', output: '1' }, { input: 'abc\nabc', output: '0' }],
    starter: 'first = input()\nsecond = input()\ncount = 0\n# Compare each position.\nprint(count)\n',
    solution: 'first = input()\nsecond = input()\ncount = 0\nfor index in range(len(first)):\n    if first[index] != second[index]:\n        count += 1\nprint(count)\n',
    java: 'int[] first = nextLine().codePoints().toArray();\nint[] second = nextLine().codePoints().toArray();\nint count = 0;\nfor (int i = 0; i < first.length; i++) if (first[i] != second[i]) count++;\nreturn String.valueOf(count);',
    steps: ['Start count at 0.', 'Visit each position in the first string.', 'Add 1 when the two characters at that position differ.'],
    edge: 'Two empty strings have 0 different positions.',
    hints: ['Use range(len(first)).', 'Compare first[index] and second[index].'],
    source: 'https://exercism.org/tracks/python/exercises/hamming',
    tests: makeTests(['cat\ncar', 'abc\nabc', '\n\n', 'A\na', 'abcd\nwxyz'], r => { const first = randomText(r, 10); const second = Array.from({ length: first.length }, () => letters[randomInt(r, 0, letters.length - 1)]).join(''); return `${first}\n${second}\n`; }, 126)
  },
  {
    num: 27, slug: 'count-words', title: 'Count Words', category: '04-strings', kind: 'numbers',
    learn: 'split() divides text at spaces and gives a list of words. len() gives the number of items in that list.',
    learnCode: 'words = "red blue green".split()\nprint(len(words))  # 3',
    task: 'Read one line of text. Count its space-separated words. Extra spaces do not make extra words. Show the count.',
    spanish: 'Lee una línea. Cuenta las palabras separadas por espacios.',
    examples: [{ input: 'red blue green', output: '3' }, { input: '  one   two', output: '2' }],
    starter: 'text = input()\n# Count the words.\n',
    solution: 'text = input()\nwords = text.split()\nprint(len(words))\n',
    java: 'String text = nextLine().trim();\nreturn String.valueOf(text.isEmpty() ? 0 : text.split("\\\\s+").length);',
    steps: ['Use split() to make a list of words.', 'Use len() to count the list items.', 'Show the count.'],
    edge: 'An empty line or a line with only spaces has 0 words.',
    hints: ['Use text.split().', 'Use len(words).'],
    tests: makeTests(['red blue green', '  one   two  ', '\n', 'word', '   ', 'a b c d'], r => { const phrase = randomPhrase(r); return phrase || '\n'; }, 127)
  },
  {
    num: 28, slug: 'make-an-acronym', title: 'Make an Acronym', category: '04-strings', kind: 'text',
    learn: 'The first letter of each word can make a short name. upper() makes those letters capitals.',
    learnCode: 'word = "cat"\nprint(word[0].upper())  # C',
    task: 'Read one line of words. Take the first letter of each word. Show the letters together in upper case. Words contain only English letters. Spaces separate words.',
    spanish: 'Toma la primera letra de cada palabra. Une las letras y muéstralas en mayúsculas.',
    examples: [{ input: 'portable network graphics', output: 'PNG' }, { input: 'Blue sky', output: 'BS' }],
    starter: 'text = input()\nletters = []\n# Add the first letter of each word.\nprint("".join(letters))\n',
    solution: 'text = input()\nletters = []\nfor word in text.split():\n    letters.append(word[0].upper())\nprint("".join(letters))\n',
    java: 'String text = nextLine().trim();\nif (text.isEmpty()) return "";\nStringBuilder answer = new StringBuilder();\nfor (String word : text.split("\\\\s+")) answer.append(Character.toUpperCase(word.charAt(0)));\nreturn answer.toString();',
    steps: ['Use split() to get the words.', 'Take index 0 of each word and make it upper case.', 'Join the letters with no spaces.'],
    edge: 'A blank line has no words, so its acronym is empty.',
    hints: ['Loop through text.split().', 'Use word[0].upper() and append it.'],
    source: 'https://exercism.org/tracks/python/exercises/acronym',
    tests: makeTests(['portable network graphics', 'Blue sky', '\n', 'one', '  red   apple  ', 'a b c'], r => { const phrase = randomPhrase(r); return phrase || '\n'; }, 128)
  }
];
