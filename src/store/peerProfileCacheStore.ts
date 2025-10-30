import { create } from 'zustand';

export interface PeerProfileEntry {
  displayName: string;
  avatarUrl: string | null;
  updatedAt: number;
}

interface MergePayload {
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface PeerProfileCacheState {
  cache: Record<string, PeerProfileEntry>;
  mergeEntries: (entries: Record<string, MergePayload>) => void;
  reset: () => void;
}

const sanitizeDisplayName = (value: string | null | undefined): string => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : '';
};

const sanitizeAvatarUrl = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const usePeerProfileCacheStore = create<PeerProfileCacheState>((set) => ({
  cache: {},
  mergeEntries: (entries) => {
    if (!entries || Object.keys(entries).length === 0) {
      return;
    }

    set((state) => {
      let nextCache = state.cache;
      let changed = false;
      const now = Date.now();

      Object.entries(entries).forEach(([key, payload]) => {
        const safeKey = (key ?? '').trim();
        if (!safeKey) return;

        const incomingName = sanitizeDisplayName(payload.displayName);
        const incomingAvatar = sanitizeAvatarUrl(payload.avatarUrl);
        const existing = nextCache[safeKey];

        const resolvedName = incomingName || existing?.displayName || '';
        const resolvedAvatar = incomingAvatar ?? existing?.avatarUrl ?? null;

        if (!existing || existing.displayName !== resolvedName || existing.avatarUrl !== resolvedAvatar) {
          if (!changed) {
            nextCache = { ...state.cache };
            changed = true;
          }
          nextCache[safeKey] = {
            displayName: resolvedName,
            avatarUrl: resolvedAvatar,
            updatedAt: now,
          };
        }
      });

      return changed ? { cache: nextCache } : state;
    });
  },
  reset: () => set({ cache: {} }),
}));

export const makePeerNameKey = (displayName?: string | null): string | null => {
  const trimmed = (displayName ?? '').trim();
  if (!trimmed) return null;
  return `name:${trimmed.toLowerCase()}`;
};

export const resolvePeerProfile = (userId?: string | null, displayName?: string | null): PeerProfileEntry | null => {
  const { cache } = usePeerProfileCacheStore.getState();
  const candidates: string[] = [];
  if (userId && userId.trim().length > 0) {
    candidates.push(userId.trim());
  }
  const nameKey = makePeerNameKey(displayName);
  if (nameKey) {
    candidates.push(nameKey);
  }

  for (const key of candidates) {
    const entry = cache[key];
    if (entry) {
      return entry;
    }
  }

  return null;
};

export const resolvePeerAvatarUrl = (userId?: string | null, displayName?: string | null): string | null => {
  const entry = resolvePeerProfile(userId, displayName);
  return entry?.avatarUrl ?? null;
};

export const resolvePeerDisplayName = (userId?: string | null, displayName?: string | null): string | null => {
  const entry = resolvePeerProfile(userId, displayName);
  if (!entry) {
    return (displayName ?? null) && displayName!.trim().length > 0 ? displayName!.trim() : null;
  }
  return entry.displayName || null;
};
