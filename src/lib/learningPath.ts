export const LEARNING_PATH_PHASES = [
    {
        name: 'Foundation',
        title: 'Write good Python',
        description: 'Structure code, work with real data, and verify behavior.',
        steps: [
            { id: 'pybites-oop', title: 'OOP' },
            { id: 'pybites-pytest', title: 'Pytest' },
            { id: 'pybites-data-formats', title: 'Data Formats' },
            { id: 'pybites-collections', title: 'Collections' },
            { id: 'pybites-decorators-context-managers', title: 'Decorators and Context Managers' }
        ]
    },
    {
        name: 'Build',
        title: 'Build real applications',
        description: 'Build services, store data, and connect to other systems.',
        steps: [
            { id: 'pybites-fastapi', title: 'FastAPI' },
            { id: 'pybites-sqlmodel', title: 'SQLModel' },
            { id: 'pybites-datetimes-timezones', title: 'Datetimes and Timezones' },
            { id: 'pybites-typer', title: 'Typer' }
        ]
    }
];

export const LEARNING_PATH_COURSE_IDS = new Set(
    LEARNING_PATH_PHASES.flatMap((phase) => phase.steps.map((step) => step.id))
);

export type LearningPathCourse = { id: string; problemIds?: string[] };

export function buildLearningPath(courses: LearningPathCourse[], solved: Record<string, boolean>) {
    const byId = new Map(courses.map((course) => [course.id, course]));
    let number = 0;
    const phases = LEARNING_PATH_PHASES.map((phase) => ({
        ...phase,
        steps: phase.steps.map((step) => {
            const ids = [...new Set(byId.get(step.id)?.problemIds ?? [])];
            const done = ids.filter((id) => solved[id] === true).length;
            return {
                ...step,
                number: ++number,
                done,
                total: ids.length,
                available: ids.length > 0,
                complete: ids.length > 0 && done === ids.length
            };
        })
    }));
    const steps = phases.flatMap((phase) => phase.steps);
    return {
        phases,
        done: steps.reduce((sum, step) => sum + step.done, 0),
        total: steps.reduce((sum, step) => sum + step.total, 0),
        unavailable: steps.filter((step) => !step.available).length,
        next: steps.find((step) => step.available && !step.complete)
    };
}
