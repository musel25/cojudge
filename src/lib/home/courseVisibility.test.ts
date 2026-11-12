import { describe, expect, it } from 'vitest';
import { filterCourses, isCourseVisible, readCourseVisibility, restoredCourseId } from './courseVisibility';

const courses = [{ id: 'arrays', title: 'Arrays' }, { id: 'trees', title: 'Binary Trees', hidden: true }];

describe('home course visibility', () => {
    it('uses course defaults unless the viewer supplies an override', () => {
        expect(isCourseVisible(courses[0], {})).toBe(true);
        expect(isCourseVisible(courses[1], {})).toBe(false);
        expect(isCourseVisible(courses[0], { arrays: false })).toBe(false);
        expect(isCourseVisible(courses[1], { trees: true })).toBe(true);
    });
    it('searches visible courses or the full management inventory', () => {
        expect(filterCourses(courses, {}, '', false)).toEqual([courses[0]]);
        expect(filterCourses(courses, {}, ' BINARY ', true)).toEqual([courses[1]]);
        expect(filterCourses(courses, { trees: true }, 'trees', false)).toEqual([courses[1]]);
    });
    it('restores saved preferences and tolerates invalid or unavailable storage', () => {
        expect(readCourseVisibility({ getItem: () => '{"trees":true}' })).toEqual({ trees: true });
        for (const text of ['[]', 'null', 'broken']) {
            expect(readCourseVisibility({ getItem: () => text })).toEqual({});
        }
        expect(readCourseVisibility({ getItem: () => { throw new Error('blocked'); } })).toEqual({});
    });
    it('restores a saved visible course only when the URL does not select a course', () => {
        expect(restoredCourseId(false, 'arrays', 'trees', courses)).toBe('arrays');
        expect(restoredCourseId(true, 'arrays', 'trees', courses)).toBeNull();
        expect(restoredCourseId(false, 'missing', 'arrays', courses)).toBeNull();
    });
    it('moves an unavailable current course to the first visible course and supports no courses', () => {
        expect(restoredCourseId(false, 'missing', 'missing', courses)).toBe('arrays');
        expect(restoredCourseId(false, null, 'missing', [])).toBeNull();
    });
});
