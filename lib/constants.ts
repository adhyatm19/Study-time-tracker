export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/settings", label: "Settings" }
] as const;

export const BGM_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "white-noise", label: "White noise" },
  { value: "fireplace", label: "Fireplace" },
  { value: "rain", label: "Rain" }
] as const;

export const AUDIO_TRACKS: Record<Exclude<(typeof BGM_OPTIONS)[number]["value"], "off">, string> = {
  "white-noise": "/audio/white-noise.mp3",
  fireplace: "/audio/fireplace.mp3",
  rain: "/audio/rain.mp3"
};

export const LEADERBOARD_FILTERS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" }
] as const;

export const APP_NAME = "Quiet Ledger";
