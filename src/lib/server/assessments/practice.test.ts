import { describe, expect, it } from 'vitest';
import { checkQuestions, publicQuestions, recommendDrill } from './practice';

describe('assessment practice', () => {
	it('selects a drill only after repeat failures and drops its answer from the prompt', () => {
		expect(recommendDrill([['edge'], ['syntax']])).toBeNull();
		const drill = recommendDrill([['edge'], ['syntax'], ['edge']]);
		expect(drill?.kind).toBe('edge');
		expect(drill && publicQuestions(drill.questions)[0]).not.toHaveProperty('answer');
	});

	it('checks all four comprehension answers and rejects missing or out-of-range options', () => {
		const questions = Array.from({ length: 4 }, () =>
			({ prompt: 'What is returned?', choices: ['3', '4'], answer: 1 }));
		expect(checkQuestions(questions, ['1', '0', '1', '0'])).toEqual([
			{ correct: true, answer: '4' }, { correct: false, answer: '4' },
			{ correct: true, answer: '4' }, { correct: false, answer: '4' }
		]);
		expect(checkQuestions(questions, ['1'])).toBeNull();
		expect(checkQuestions(questions, ['2', '0', '1', '0'])).toBeNull();
	});
});
