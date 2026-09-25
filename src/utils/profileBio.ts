/** Bio column may store onboarding JSON; user-facing text lives in `about`. */

export function getDisplayBio(bio: string | null | undefined): string {
  if (!bio?.trim()) return '';
  const raw = bio.trim();
  if (!raw.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.about === 'string') return parsed.about;
    if (typeof parsed.user_bio === 'string') return parsed.user_bio;
    return '';
  } catch {
    return '';
  }
}

export function mergeBioForSave(
  currentBio: string | null | undefined,
  aboutText: string,
): string | null {
  const about = aboutText.trim();
  let envelope: Record<string, unknown> | null = null;

  if (currentBio?.trim()?.startsWith('{')) {
    try {
      envelope = JSON.parse(currentBio) as Record<string, unknown>;
    } catch {
      envelope = null;
    }
  }

  if (envelope && typeof envelope === 'object') {
    const next = { ...envelope };
    if (about) next.about = about;
    else {
      delete next.about;
      delete next.user_bio;
    }
    return JSON.stringify(next);
  }

  return about || null;
}
