import { describe, expect, it } from 'vitest';
import { buildLearningPath } from './learningPath';

describe('learning path progress', () => {
    it('continues with the first unfinished course in learning order', () => {
        const path = buildLearningPath([
            { id: 'pybites-fastapi', problemIds: ['api-1'] },
            { id: 'pybites-pytest', problemIds: ['test-1', 'test-2'] },
            { id: 'pybites-oop', problemIds: ['oop-1'] }
        ], { 'oop-1': true, 'test-1': true, unrelated: true });

        expect(path.next?.id).toBe('pybites-pytest');
        expect(path.done).toBe(2);
        expect(path.total).toBe(4);
        expect(path.phases[0].steps[0].complete).toBe(true);
        expect(path.phases[0].steps[1].done).toBe(1);
    });

    it('keeps missing courses visible and skips them when continuing', () => {
        const path = buildLearningPath([
            { id: 'pybites-fastapi', problemIds: ['api-1'] },
            { id: 'pybites-oop', problemIds: [] }
        ], {});

        expect(path.phases[0].steps[0].available).toBe(false);
        expect(path.phases[0].steps[4].available).toBe(false);
        expect(path.next?.id).toBe('pybites-fastapi');
        expect(path.unavailable).toBe(8);
    });

    it('does not count duplicate exercises or mark empty courses complete', () => {
        const path = buildLearningPath([
            { id: 'pybites-oop', problemIds: ['oop-1', 'oop-1'] },
            { id: 'pybites-pytest', problemIds: [] }
        ], { 'oop-1': true });

        expect(path.done).toBe(1);
        expect(path.total).toBe(1);
        expect(path.next).toBeUndefined();
        expect(path.phases[0].steps[1].complete).toBe(false);
    });

    it('uses only the current completion flags when progress changes', () => {
        const courses = [{ id: 'pybites-oop', problemIds: ['oop-1'] }];
        expect(buildLearningPath(courses, { 'oop-1': true }).next).toBeUndefined();
        expect(buildLearningPath(courses, { 'oop-1': false }).next?.id).toBe('pybites-oop');
    });
});
