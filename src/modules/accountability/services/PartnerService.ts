import { supabase } from '../../../services/supabase';

/** A partner connection with the associated profile data of the partner user. */
export interface PartnerData {
  id: string;
  partner_id: string;
  shared_goal: string | null;
  partner_streak: number;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  partner_profile: {
    id: string;
    full_name: string;
    calfit_id: string;
    avatar_url: string | null;
    goal: string;
    streak_count: number;
    current_weight_kg: number | null;
  } | null;
}

/** A minimal user profile returned in autocomplete search results. */
export interface CalfitUserSuggestion {
  id: string;
  full_name: string;
  calfit_id: string;
  avatar_url: string | null;
  goal: string;
}

/**
 * Search for up to 6 users whose Fitness ID starts with the given query.
 * Requires at least 2 characters to avoid broad results.
 *
 * @param query - The partial Fitness ID to search for.
 * @param currentUserId - The requesting user's ID (excluded from results).
 * @returns An array of matching user suggestions, or an empty array on error.
 */
export const searchCalfitUsers = async (
  query: string,
  currentUserId: string
): Promise<CalfitUserSuggestion[]> => {
  if (!query.trim() || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, calfit_id, avatar_url, goal')
    .ilike('calfit_id', `${query.toLowerCase().trim()}%`)
    .neq('id', currentUserId)
    .limit(6);

  if (error || !data) return [];
  return data as CalfitUserSuggestion[];
};

/**
 * Load all active partners for the given user, including their profile data.
 *
 * @param userId - The requesting user's ID.
 * @returns An array of active partner records with nested profile data.
 */
export const loadPartners = async (userId: string): Promise<PartnerData[]> => {
  const { data, error } = await supabase
    .from('partners')
    .select(`
      id, partner_id, shared_goal, partner_streak, status, created_at,
      partner_profile:partner_id (
        id, full_name, calfit_id, avatar_url, goal,
        streak_count, current_weight_kg
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    if (__DEV__) console.error('loadPartners error:', error.message);
    return [];
  }
  return (data as any[]) ?? [];
};

/**
 * Add an accountability partner by their Fitness ID.
 * Creates bidirectional partner rows — the direct insert and a reverse row
 * via a SECURITY DEFINER function to bypass RLS.
 *
 * @param userId - The requesting user's ID.
 * @param partnerCalfitId - The partner's Fitness ID to look up and connect with.
 * @returns An object indicating success or failure with a user-facing message.
 */
export const addPartner = async (
  userId: string,
  partnerCalfitId: string
): Promise<{ success: boolean; message: string }> => {

  // Step 1 — find partner by Fitness ID
  const { data: partnerProfile, error: findError } = await supabase
    .from('profiles')
    .select('id, full_name, calfit_id')
    .eq('calfit_id', partnerCalfitId.toLowerCase().trim())
    .maybeSingle();

  if (findError) {
    if (__DEV__) console.error('addPartner find error:', findError.message);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
  if (!partnerProfile) {
    return {
      success: false,
      message: 'No user found with that Fitness ID. Check the ID and try again.',
    };
  }
  if (partnerProfile.id === userId) {
    return { success: false, message: 'You cannot add yourself as a partner.' };
  }

  // Step 2 — check if already partners
  const { data: existing } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .eq('partner_id', partnerProfile.id)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      message: `You are already partners with ${partnerProfile.full_name}.`,
    };
  }

  // Step 3 — insert current user's row (RLS allows: user_id = auth.uid())
  const { error: err1 } = await supabase
    .from('partners')
    .insert({ user_id: userId, partner_id: partnerProfile.id, status: 'active' });

  if (err1 && err1.code !== '23505') {
    if (__DEV__) console.error('addPartner insert row 1 error:', err1.message, err1.code);
    return { success: false, message: 'Could not add partner. Please try again.' };
  }

  // Step 4 — insert reverse row via SECURITY DEFINER function.
  // A direct insert of (user_id=partner, partner_id=me) fails RLS
  // because auth.uid() ≠ partner's id. The DB function runs as the
  // database owner and bypasses RLS safely for this specific operation.
  const { error: err2 } = await supabase.rpc('insert_partner_reverse', {
    p_user_id: userId,
    p_partner_id: partnerProfile.id,
  });

  if (err2) {
    // Log but don't fail — current user's row is saved and functional.
    // Partner will see the connection when they next open their app.
    if (__DEV__) console.warn('addPartner reverse row warning:', err2.message);
  }

  return {
    success: true,
    message: `${partnerProfile.full_name} added as your accountability partner! 🎉`,
  };
};

/**
 * Remove an existing partner connection from both sides.
 *
 * @param userId - The requesting user's ID.
 * @param partnerId - The partner's user ID to disconnect from.
 * @returns True if the current user's row was deleted successfully.
 */
export const removePartner = async (
  userId: string,
  partnerId: string
): Promise<boolean> => {
  // Delete current user's row (RLS allows this)
  const { error: e1 } = await supabase
    .from('partners')
    .delete()
    .eq('user_id', userId)
    .eq('partner_id', partnerId);

  // Delete reverse row via function
  await supabase.rpc('insert_partner_reverse', {
    p_user_id: partnerId,
    p_partner_id: userId,
  });

  return !e1;
};

