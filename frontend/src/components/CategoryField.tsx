import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CATEGORY_OPTIONS, CUSTOM_CATEGORY_MAX_LENGTH, OTHER_CATEGORY, isKnownCategory } from '@/lib/categories';

interface CategoryFieldProps {
    value: string;
    onChange: (value: string) => void;
    id?: string;
    required?: boolean;
    align?: 'start' | 'center' | 'end';
    triggerClassName?: string;
    customClassName?: string;
}

export function CategoryField({
    value,
    onChange,
    id,
    required,
    align = 'start',
    triggerClassName,
    customClassName,
}: CategoryFieldProps) {
    const initialIsOther = value !== '' && !isKnownCategory(value);
    const [isOther, setIsOther] = useState(initialIsOther);
    const [customValue, setCustomValue] = useState(initialIsOther ? value : '');

    const handleSelect = (next: string) => {
        if (next === OTHER_CATEGORY) {
            setIsOther(true);
            onChange(customValue);
        } else {
            setIsOther(false);
            setCustomValue('');
            onChange(next);
        }
    };

    const handleCustomChange = (next: string) => {
        const trimmed = next.slice(0, CUSTOM_CATEGORY_MAX_LENGTH);
        setCustomValue(trimmed);
        onChange(trimmed);
    };

    const displayLabel = isOther ? OTHER_CATEGORY : value;

    return (
        <div className="flex flex-col gap-3">
            <DropdownMenu>
                <DropdownMenuTrigger
                    id={id}
                    type="button"
                    className={cn(
                        'flex w-full items-center gap-2 outline-none',
                        !displayLabel && 'text-muted-foreground',
                        triggerClassName,
                    )}
                >
                    <span className={cn('truncate', !displayLabel && 'text-base font-normal')}>
                        {displayLabel || 'Select a category…'}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align={align} className="min-w-40 scrollbar-subtle">
                    {CATEGORY_OPTIONS.map((option) => (
                        <DropdownMenuItem key={option} onSelect={() => handleSelect(option)}>
                            {option}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onSelect={() => handleSelect(OTHER_CATEGORY)}>{OTHER_CATEGORY}</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {isOther && (
                <input
                    type="text"
                    value={customValue}
                    maxLength={CUSTOM_CATEGORY_MAX_LENGTH}
                    placeholder={`Custom category (max ${CUSTOM_CATEGORY_MAX_LENGTH} chars)`}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    required={required}
                    className={cn('bg-transparent outline-none', customClassName)}
                />
            )}
        </div>
    );
}
