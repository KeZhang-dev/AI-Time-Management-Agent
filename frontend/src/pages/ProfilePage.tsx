import { useRef, useState } from 'react';
import { Camera, ChevronDown, Pencil, X } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateAvatar, updateName } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL_ID } from '@/lib/aiModels';

const MAX_AVATAR_FILE_BYTES = 1_500_000;

const sectionLabelClass = 'text-sm font-semibold uppercase tracking-widest text-muted-foreground';

export function ProfilePage() {
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    const [selectedModelId, setSelectedModelId] = useState(DEFAULT_AI_MODEL_ID);

    if (!user) return null;

    const selectedModel =
        AI_MODEL_OPTIONS.find((option) => option.id === selectedModelId) ?? AI_MODEL_OPTIONS[0];

    const startEditingName = () => {
        setNameDraft(user.name || user.username);
        setNameError(null);
        setEditingName(true);
    };

    const cancelEditingName = () => {
        setEditingName(false);
        setNameError(null);
    };

    const saveName = async () => {
        const trimmed = nameDraft.trim();
        if (!trimmed) {
            setNameError('Name cannot be empty.');
            return;
        }
        setSavingName(true);
        setNameError(null);
        try {
            const updated = await updateName(trimmed);
            updateUser(updated);
            setEditingName(false);
        } catch (err) {
            setNameError(err instanceof Error ? err.message : 'Failed to save name.');
        } finally {
            setSavingName(false);
        }
    };

    const handleAvatarFile = async (file: File) => {
        setAvatarError(null);

        if (!file.type.startsWith('image/')) {
            setAvatarError('Please choose an image file.');
            return;
        }
        if (file.size > MAX_AVATAR_FILE_BYTES) {
            setAvatarError('Image is too large (max 1.5MB).');
            return;
        }

        setUploadingAvatar(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Failed to read the image file.'));
                reader.readAsDataURL(file);
            });
            const updated = await updateAvatar(dataUrl);
            updateUser(updated);
        } catch (err) {
            setAvatarError(err instanceof Error ? err.message : 'Failed to upload avatar.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    return (
        <AppLayout>
            <main className="relative z-10 mx-4 flex-1 py-10 pb-20 sm:mx-8">
                <div className="mx-auto max-w-2xl">
                    <h1 className="mb-6 text-2xl font-semibold tracking-tight">Profile</h1>

                    <section className="mb-8 rounded-lg border border-border bg-surface p-6 sm:p-8">

                        <div className="flex flex-col items-center gap-3">
                            <div className="relative shrink-0">
                                <UserAvatar
                                    name={user.name || user.username}
                                    avatarDataUrl={user.avatarDataUrl}
                                    className="size-25 text-xl"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    aria-label="Change avatar"
                                    className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                                >
                                    <Camera className="size-3.5" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (file) void handleAvatarFile(file);
                                    }}
                                />
                            </div>

                            {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
                        </div>

                        <div className="mt-8 flex flex-col gap-2">
                            <Label className={sectionLabelClass}>Name</Label>
                            {editingName ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={nameDraft}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        maxLength={100}
                                        autoFocus
                                        className="max-w-sm"
                                    />
                                    <Button size="sm" onClick={() => void saveName()} disabled={savingName}>
                                        {savingName ? 'Saving…' : 'Save'}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelEditingName}
                                        disabled={savingName}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <p className="text-base font-medium text-foreground">
                                        {user.name || user.username}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={startEditingName}
                                        aria-label="Edit name"
                                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                    >
                                        <Pencil className="size-3.5" />
                                    </button>
                                </div>
                            )}
                            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                        </div>

                        <div className="mt-6 flex flex-col gap-2">
                            <Label className={sectionLabelClass}>Email</Label>
                            <p className="text-base text-muted-foreground">{user.username}</p>
                        </div>
                    </section>

                    <section className="rounded-lg border border-border bg-surface p-6 sm:p-8">
                        <h2 className={`mb-6 ${sectionLabelClass}`}>AI Model</h2>

                        <DropdownMenu>
                            <DropdownMenuTrigger
                                type="button"
                                className="flex w-full max-w-sm items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <span className="font-medium text-foreground">{selectedModel.version}</span>
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-56 scrollbar-subtle">
                                {AI_MODEL_OPTIONS.map((option) => (
                                    <DropdownMenuItem key={option.id} onSelect={() => setSelectedModelId(option.id)}>
                                        {option.version}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <p className="mt-3 text-xs text-muted-foreground/70">
                            More models will be available in the future.
                        </p>
                    </section>
                </div>
            </main>
        </AppLayout>
    );
}
