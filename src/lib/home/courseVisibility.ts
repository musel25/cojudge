import type { CourseSummary } from './catalog';

export const COURSE_STORAGE_KEY = 'selected-course';
export const COURSE_VISIBILITY_KEY = 'course-visibility';

export function readCourseVisibility(storage: Pick<Storage, 'getItem'>): Record<string, boolean> {
    try {
        const parsed = JSON.parse(storage.getItem(COURSE_VISIBILITY_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function isCourseVisible(course: CourseSummary, preferences: Record<string, boolean>): boolean {
    return preferences[course.id] ?? !course.hidden;
}

export function filterCourses(courses: CourseSummary[], preferences: Record<string, boolean>, search: string, manageLists: boolean): CourseSummary[] {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => (manageLists || isCourseVisible(course, preferences)) && course.title.toLowerCase().includes(query));
}

/** A URL choice wins over storage. Missing courses fall back to the first visible course. */
export function restoredCourseId(hasCourseParameter: boolean, saved: string | null, selected: string | null, visibleCourses: CourseSummary[]): string | null {
    if (hasCourseParameter) return null;
    if (saved && visibleCourses.some((course) => course.id === saved)) return saved;
    return visibleCourses.some((course) => course.id === selected) ? null : visibleCourses[0]?.id ?? null;
}
