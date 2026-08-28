export const CATEGORY_OPTIONS = [
    'Work',
    'Study',
    'Searching',
    'Games',
    'Videos',
    'Sleep',
    'Rest',
    'Exercise',
    'Meals',
    'Social',
    'Walk',
    'Toilet',
    'Shopping',
] as const;

export const OTHER_CATEGORY = 'Other';

export const CUSTOM_CATEGORY_MAX_LENGTH = 10;

export function isKnownCategory(value: string): boolean {
    return (CATEGORY_OPTIONS as readonly string[]).includes(value);
}
