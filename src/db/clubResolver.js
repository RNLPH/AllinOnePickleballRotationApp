import { supabase } from "./supabase";

/**
 * Resolves a slug or UUID to a club record.
 * Tries UUID match first, then falls back to slug lookup.
 * Returns { id, name, slug } or null if not found.
 */
export async function resolveClub(identifier) {
  // UUID pattern
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  if (isUUID) {
    const { data } = await supabase
      .from("clubs")
      .select("id, name, slug")
      .eq("id", identifier)
      .single();
    return data || null;
  }

  // Try slug lookup
  const { data } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", identifier.toLowerCase())
    .single();
  return data || null;
}

/**
 * Update a club's slug
 */
export async function updateClubSlug(clubId, slug) {
  const trimmed = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (trimmed.length < 2) return { error: "Slug must be at least 2 characters." };
  if (trimmed.length > 30) return { error: "Slug cannot exceed 30 characters." };

  // Check uniqueness
  const { data: existing } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", trimmed)
    .neq("id", clubId)
    .single();

  if (existing) return { error: "This slug is already taken." };

  const { error } = await supabase
    .from("clubs")
    .update({ slug: trimmed })
    .eq("id", clubId);

  if (error) return { error: error.message };
  return { slug: trimmed };
}
