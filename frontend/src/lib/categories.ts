export const CATEGORY_OPTIONS = [
    'Work',
    'Sleep',
    'Exercise',
    'Travel',
    'Study',
    'Meals',
    'Social',
    'Chores',
    'Entertainment',
] as const;

export const OTHER_CATEGORY = 'Other';

export const CUSTOM_CATEGORY_MAX_LENGTH = 10;

export function isKnownCategory(value: string): boolean {
    return (CATEGORY_OPTIONS as readonly string[]).includes(value);
}
