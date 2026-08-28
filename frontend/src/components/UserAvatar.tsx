import { cn } from '@/lib/utils';

interface UserAvatarProps {
    name: string;
    avatarDataUrl: string | null;
    /** Sizing utility classes (e.g. "size-8"), applied to both the image and the initials fallback. */
    className?: string;
}

function initialsFor(name: string): string {
    return name.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, avatarDataUrl, className }: UserAvatarProps) {
    if (avatarDataUrl) {
        return (
            <img
                src={avatarDataUrl}
                alt=""
                className={cn('shrink-0 rounded-full object-cover', className)}
            />
        );
    }

    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground',
                className,
            )}
        >
            {initialsFor(name)}
        </div>
    );
}
