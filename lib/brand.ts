// ============================================================
// UNEQWURL — Centralized brand & category configuration
// Edit this file to change app name, colors, photos, or icons.
// ============================================================

export const APP_NAME = "UNEQWURL";
export const APP_TAGLINE = "Audio Enhancement Studio";

export type CategoryKey = "music" | "podcast" | "live" | "stream";

export interface CategoryConfig {
  id: CategoryKey;
  label: string;
  colorVar: string; // CSS variable name e.g. "--orange"
  colorValue: string; // Hex/HSL value for inline use
  photo: string;
  photoLight: string;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: "music",
    label: "Music",
    colorVar: "var(--orange)",
    colorValue: "hsl(27,93%,60%)",
    photo: "/assets/albumart/music.jpg",
    photoLight: "/assets/albumart/music.jpg",
  },
  {
    id: "podcast",
    label: "Podcast",
    colorVar: "var(--blue)",
    colorValue: "#00a6ff",
    photo: "/assets/albumart/podcast.jpg",
    photoLight: "/assets/albumart/podcast.jpg",
  },
  {
    id: "live",
    label: "Live",
    colorVar: "var(--red)",
    colorValue: "#ff0056",
    photo: "/assets/albumart/live.jpg",
    photoLight: "/assets/albumart/live.jpg",
  },
  {
    id: "stream",
    label: "Stream",
    colorVar: "var(--purple)",
    colorValue: "#6500ff",
    photo: "/assets/albumart/stream.jpg",
    photoLight: "/assets/albumart/stream.jpg",
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryKey, CategoryConfig>;

/** Legacy alias: old 'voice' maps to 'live' for backward compat */
export const LEGACY_TYPE_MAP: Record<string, CategoryKey> = {
  voice: "live",
  music: "music",
  podcast: "podcast",
};
