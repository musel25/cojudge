import type { Mistake } from './attempts';
import type { Comprehension } from './schema';

type Question = Comprehension['questions'][number];

const drills: Record<Mistake, { title: string; question: Question }> = {
	requirements: {
		title: 'Read the return contract',
		question: {
			prompt: 'A method must return the previous quantity on success. A record held 8 units. You replace it with 3. What should the method return?',
			choices: ['3', '8', 'True'], answer: 1
		}
	},
	syntax: {
		title: 'Check Python syntax',
		question: {
			prompt: 'Which line starts a valid Python method definition?',
			choices: ['def available(self, item)', 'def available(self, item):', 'def available[item]:'], answer: 1
		}
	},
	state: {
		title: 'Trace a state update',
		question: {
			prompt: 'A record starts at 9. The first method adds 4. The second subtracts 2. What must a later read return?',
			choices: ['7', '13', '11'], answer: 2
		}
	},
	validation: {
		title: 'Validate before writing',
		question: {
			prompt: 'A method rejects duplicate IDs. What should it do when an ID already exists?',
			choices: ['Replace the existing record', 'Keep the existing record and return failure', 'Delete the existing record'], answer: 1
		}
	},
	edge: {
		title: 'Test the boundary',
		question: {
			prompt: 'A token is valid when the current time is less than its expiration time. The expiration time is 12. Which time is the first invalid one?',
			choices: ['11', '12', '13'], answer: 1
		}
	},
	regression: {
		title: 'Check the old behavior',
		question: {
			prompt: 'You add sorting to a list operation. Which test checks for a regression in the read operation?',
			choices: ['Run only the new sorting cases', 'Check the old read cases against their original expected results', 'Read the implementation without running tests'], answer: 1
		}
	}
};

export function recommendDrill(history: Mistake[][]) {
	const counts = new Map<Mistake, number>();
	for (const submission of history) {
		for (const mistake of new Set(submission)) counts.set(mistake, (counts.get(mistake) ?? 0) + 1);
	}
	const kind = [...counts].sort(([, left], [, right]) => right - left)
		.find(([, count]) => count >= 2)?.[0];
	if (!kind) return null;
	return { kind, title: drills[kind].title, questions: [drills[kind].question] };
}

export function publicQuestions(questions: Question[]) {
	return questions.map(({ prompt, choices }) => ({ prompt, choices }));
}

export function checkQuestions(questions: Question[], answers: FormDataEntryValue[]) {
	if (questions.length !== answers.length) return null;
	const indexes = answers.map((answer) => typeof answer === 'string' && /^[0-4]$/.test(answer) ? Number(answer) : -1);
	if (indexes.some((answer, index) => answer < 0 || answer >= questions[index].choices.length)) return null;
	return questions.map(({ choices, answer }, index) => ({ correct: indexes[index] === answer, answer: choices[answer] }));
}
