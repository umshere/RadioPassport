/**
 * Dynamic Color Extraction Utility
 * Extracts dominant colors from station artwork to create dynamic, music-first UI
 */

export interface ExtractedColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  gradient: string;
  isDark: boolean;
}

// Predefined themed color palettes for different genres
const GENRE_PALETTES: Record<string, ExtractedColors> = {
  jazz: {
    primary: "#1a1a2e",
    secondary: "#16213e",
    accent: "#e94560",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    isDark: true,
  },
  chill: {
    primary: "#2d3436",
    secondary: "#636e72",
    accent: "#74b9ff",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #2d3436 0%, #0984e3 50%, #74b9ff 100%)",
    isDark: true,
  },
  rock: {
    primary: "#2c2c2c",
    secondary: "#3d3d3d",
    accent: "#ff6b6b",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #2c2c2c 0%, #434343 50%, #ff6b6b 100%)",
    isDark: true,
  },
  electronic: {
    primary: "#0c0c1e",
    secondary: "#1a1a3e",
    accent: "#a855f7",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #0c0c1e 0%, #1e1b4b 50%, #a855f7 100%)",
    isDark: true,
  },
  world: {
    primary: "#1a3c34",
    secondary: "#2d5a4e",
    accent: "#fbbf24",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #1a3c34 0%, #065f46 50%, #34d399 100%)",
    isDark: true,
  },
  news: {
    primary: "#1e293b",
    secondary: "#334155",
    accent: "#3b82f6",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%)",
    isDark: true,
  },
  classical: {
    primary: "#1c1917",
    secondary: "#292524",
    accent: "#d4af37",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)",
    isDark: true,
  },
  pop: {
    primary: "#831843",
    secondary: "#be185d",
    accent: "#f472b6",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)",
    isDark: true,
  },
  hiphop: {
    primary: "#1f2937",
    secondary: "#374151",
    accent: "#f59e0b",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #1f2937 0%, #374151 50%, #f59e0b 100%)",
    isDark: true,
  },
  default: {
    primary: "#0f172a",
    secondary: "#1e293b",
    accent: "#f97316",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    isDark: true,
  },
};

// Detect genre from tags
export function detectGenre(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return "default";

  const tagString = tags.join(" ").toLowerCase();

  if (tagString.includes("jazz") || tagString.includes("blues")) return "jazz";
  if (
    tagString.includes("chill") ||
    tagString.includes("ambient") ||
    tagString.includes("lofi")
  )
    return "chill";
  if (
    tagString.includes("rock") ||
    tagString.includes("metal") ||
    tagString.includes("punk")
  )
    return "rock";
  if (
    tagString.includes("electronic") ||
    tagString.includes("techno") ||
    tagString.includes("house") ||
    tagString.includes("edm")
  )
    return "electronic";
  if (
    tagString.includes("world") ||
    tagString.includes("folk") ||
    tagString.includes("ethnic")
  )
    return "world";
  if (
    tagString.includes("news") ||
    tagString.includes("talk") ||
    tagString.includes("spoken")
  )
    return "news";
  if (
    tagString.includes("classical") ||
    tagString.includes("orchestra") ||
    tagString.includes("symphony")
  )
    return "classical";
  if (
    tagString.includes("pop") ||
    tagString.includes("top 40") ||
    tagString.includes("hits")
  )
    return "pop";
  if (
    tagString.includes("hip") ||
    tagString.includes("hop") ||
    tagString.includes("rap") ||
    tagString.includes("r&b")
  )
    return "hiphop";

  return "default";
}

// Get palette for a genre
export function getGenrePalette(genre: string): ExtractedColors {
  return GENRE_PALETTES[genre] ?? GENRE_PALETTES.default!;
}

// Get colors from station tags
export function getStationColors(
  tags: string[] | null | undefined
): ExtractedColors {
  const genre = detectGenre(tags);
  return getGenrePalette(genre);
}

// Generate vibrant fallback gradient for stations without artwork
export function generateStationGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const vibrantHues = [
    { from: "#667eea", to: "#764ba2" }, // Purple
    { from: "#f093fb", to: "#f5576c" }, // Pink
    { from: "#4facfe", to: "#00f2fe" }, // Blue
    { from: "#43e97b", to: "#38f9d7" }, // Green
    { from: "#fa709a", to: "#fee140" }, // Sunset
    { from: "#a18cd1", to: "#fbc2eb" }, // Lavender
    { from: "#ff9a9e", to: "#fecfef" }, // Rose
    { from: "#ffecd2", to: "#fcb69f" }, // Peach
    { from: "#a1c4fd", to: "#c2e9fb" }, // Sky
    { from: "#667eea", to: "#f093fb" }, // Violet
  ];

  const palette =
    vibrantHues[Math.abs(hash) % vibrantHues.length] ?? vibrantHues[0]!;
  return `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`;
}

// Get themed fallback image based on genre
export function getThemedFallbackImage(genre: string): string {
  const fallbacks: Record<string, string> = {
    jazz: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=400&fit=crop",
    chill:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    rock: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=400&fit=crop",
    electronic:
      "https://images.unsplash.com/photo-1571266028243-3899cc7a8a88?w=400&h=400&fit=crop",
    world:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    news: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=400&fit=crop",
    classical:
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=400&fit=crop",
    pop: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    hiphop:
      "https://images.unsplash.com/photo-1571609803939-cb2a1e14b4ed?w=400&h=400&fit=crop",
    default:
      "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
  };

  return fallbacks[genre] ?? fallbacks.default!;
}

// Extract colors from an image using canvas (browser only)
export async function extractColorsFromImage(
  imageUrl: string
): Promise<ExtractedColors | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        // Sample a small version for performance
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0,
          g = 0,
          b = 0;
        let count = 0;

        // Sample pixels
        for (let i = 0; i < imageData.length; i += 16) {
          r += imageData[i] ?? 0;
          g += imageData[i + 1] ?? 0;
          b += imageData[i + 2] ?? 0;
          count++;
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Calculate brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isDark = brightness < 128;

        const primary = `rgb(${r}, ${g}, ${b})`;
        const secondary = `rgb(${Math.max(0, r - 30)}, ${Math.max(
          0,
          g - 30
        )}, ${Math.max(0, b - 30)})`;
        const accent = isDark
          ? `rgb(${Math.min(255, r + 100)}, ${Math.min(
              255,
              g + 100
            )}, ${Math.min(255, b + 100)})`
          : `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(
              0,
              b - 50
            )})`;

        resolve({
          primary,
          secondary,
          accent,
          text: isDark ? "#ffffff" : "#0f172a",
          textMuted: isDark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.7)",
          gradient: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
          isDark,
        });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
