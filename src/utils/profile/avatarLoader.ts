import { supabase } from '@/integrations/supabase/client';

export interface BasicProfileAvatar {
  id: string;
  avatar_image_url?: string | null;
  avatar_url?: string | null;
  avatar_id?: string | null;
}

interface AvatarRow {
  id: string;
  firebase_url: string | null;
}

const normalizeUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveProfileAvatarUrl = (
  profile: BasicProfileAvatar | null | undefined,
  avatarsById?: Map<string, string | null>,
): string | null => {
  if (!profile) return null;
  const direct = normalizeUrl(profile.avatar_image_url) ?? normalizeUrl(profile.avatar_url);
  if (direct) return direct;
  const avatarId = profile.avatar_id ? profile.avatar_id.trim() : '';
  if (!avatarId || !avatarsById) return null;
  const resolved = avatarsById.get(avatarId);
  return normalizeUrl(resolved ?? null);
};

export const fetchAvatarUrlsForUserIds = async (
  userIds: string[],
): Promise<Record<string, string | null>> => {
  if (!userIds || userIds.length === 0) {
    return {};
  }

  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return {};
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, avatar_image_url, avatar_url, avatar_id')
    .in('id', uniqueIds);

  if (profilesError) {
    console.error('[avatarLoader] Failed to fetch profiles for avatars', profilesError);
    return {};
  }

  if (!profiles || profiles.length === 0) {
    return {};
  }

  const missingAvatarIds = Array.from(
    new Set(
      profiles
        .map((profile: any) => {
          if (!profile?.avatar_id) return null;
          const hasDirect = normalizeUrl(profile.avatar_image_url) ?? normalizeUrl(profile.avatar_url);
          return hasDirect ? null : String(profile.avatar_id);
        })
        .filter((value): value is string => !!value),
    ),
  );

  let avatarsById: Map<string, string | null> | undefined;
  if (missingAvatarIds.length > 0) {
    const { data: avatarRows, error: avatarsError } = await supabase
      .from('avatars')
      .select('id, firebase_url')
      .in('id', missingAvatarIds);

    if (avatarsError) {
      console.error('[avatarLoader] Failed to fetch avatars for profiles', avatarsError);
    } else if (avatarRows && avatarRows.length > 0) {
      avatarsById = new Map<string, string | null>(
        (avatarRows as AvatarRow[]).map((row) => [String(row.id), normalizeUrl(row.firebase_url)]),
      );
    }
  }

  const result: Record<string, string | null> = {};
  profiles.forEach((profile: any) => {
    const avatarUrl = resolveProfileAvatarUrl(profile as BasicProfileAvatar, avatarsById);
    result[String(profile.id)] = avatarUrl;
  });

  return result;
};
