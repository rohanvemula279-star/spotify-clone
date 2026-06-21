import type { Track } from "@/lib/types";

export type Language =
  | "telugu"
  | "hindi"
  | "tamil"
  | "kannada"
  | "malayalam"
  | "bengali"
  | "punjabi"
  | "english"
  | "unknown";

interface UnicodeRange {
  start: number;
  end: number;
  lang: Language;
}

const SCRIPT_RANGES: UnicodeRange[] = [
  { start: 0x0C00, end: 0x0C7F, lang: "telugu" },
  { start: 0x0900, end: 0x097F, lang: "hindi" },
  { start: 0x0B80, end: 0x0BFF, lang: "tamil" },
  { start: 0x0C80, end: 0x0CFF, lang: "kannada" },
  { start: 0x0D00, end: 0x0D7F, lang: "malayalam" },
  { start: 0x0980, end: 0x09FF, lang: "bengali" },
  { start: 0x0A00, end: 0x0A7F, lang: "punjabi" },
];

const TELUGU_ARTIST_TOKENS = new Set([
  "sp balasubrahmanyam", "s. p. balasubrahmanyam",
  "devi sri prasad", "dsp",
  "thaman s", "s. thaman",
  "mm keeravani", "m. m. keeravani",
  "mani sharma",
  "vandemataram srinivas",
  "r. p. patnaik",
  "mickey j. meyer",
  "kalyani malik",
  "anup rubens",
  "mahati swara sagar",
  "bheems ceciroleo",
  "kaala bhairava",
  "ram miriyala",
  "suresh bobbili",
  "sunny m.r.",
  "harshavardhan rameshwar",
  "vishal chandrasekhar",
  "gowra hari",
  "shiva nagulu",
  "geetha madhuri",
  "ramya behara",
  "sahithi chaganti",
  "mohana bhogaraju",
  "satya yamini",
  "narahari",
  "prudhvi chandra",
  "chaitan bharadwaj",
  "arun chandra",
  "markandeya",
  "sri krishna",
  "vishnu priya",
  "sinduri",
  "aditya iyengar",
  "nutana mohan",
  "m. m. manasi",
  "saicharan",
  "dinker kalvala",
  "jaidev",
  "smaran",
  "l. v. revanth",
  "anudeep dev",
  "damini",
  "harika narayan",
  "s. p. sailaja",
  "poonam malik",
  "mangli",
  "singer anurag",
  "shakthisree gopalan",
]);

const TELUGU_WORDS = new Set([
  "prema", "prem", "manasu", "nuvvu", "nenu", "neelo",
  "nuvvunte", "nijam", "kanulu", "kalalu", "kala",
  "kathal", "chitram", "chelli", "raatri",
  "hayi", "nuvvuleka", "ento", "entha", "pata",
  "padam", "pillagaa", "mama", "babu", "ammayi",
  "abbayi", "chelli", "tammudu", "annayya",
  "kotha", "pacha", "tella", "erra", "nalla",
  "chinna", "pedda", "manchi", "baga", "bavundi",
  "telugu", "tollywood",
]);

const HINDI_ARTIST_TOKENS = new Set([
  "arijit singh",
  "atulpratap singh",
  "shreya ghoshal",
  "kumar sanu",
  "udit narayan",
  "alka yagnik",
  "sonu nigam",
  "vishal dadlani",
  "shekhar ravjiani",
  "kk",
  "mohit chauhan",
  "atif aslam",
  "rahul vaidya",
  "palash muchhal",
  "toni kakkar",
  "neha kakkar",
  "dhvani bhanushali",
  "akshat", "badshah",
  "guru randhawa",
  "mika singh",
  "yo yo honey singh",
  "honey singh",
  "b. praak",
  "jaani",
  "nawazuddin",
  "kailash kher",
  "rahat fateh ali khan",
  "nusrat fateh ali khan",
  "abida parveen",
  "lata mangeshkar",
  "asha bhosle",
  "mohammed rafi",
  "mukesh",
  "talat mahmood",
  "hemant kumar",
  "shamshad begum",
  "geeta dutt",
  "manna dey",
  "kishore kumar",
  "amitabh",
  "asha",
  "rafi",
]);

export function detectLanguage(track: Track): Language {
  const text = `${track.name} ${track.artist} ${track.album}`;
  const textLower = text.toLowerCase();
  const textLowerNoPunct = textLower.replace(/[^\w\s]/g, "");

  const scriptLang = detectScript(text);
  if (scriptLang !== "unknown") return scriptLang;

  const artistLower = track.artist.toLowerCase().trim();

  for (const token of TELUGU_ARTIST_TOKENS) {
    if (artistLower.includes(token)) return "telugu";
  }

  const words = textLowerNoPunct.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (TELUGU_WORDS.has(word)) return "telugu";
  }

  for (const token of HINDI_ARTIST_TOKENS) {
    if (artistLower.includes(token)) {
      if (artistLower.includes("sp balasubrahmanyam") ||
          artistLower.includes("devi sri") ||
          artistLower.includes("thaman")) {
        continue;
      }
      return "hindi";
    }
  }

  if (textLower.includes("bollywood") || textLower.includes("hindi song")) {
    return "hindi";
  }

  if (textLower.includes("telugu") ||
      textLower.includes("tollywood") ||
      textLower.includes("telugu song")) {
    return "telugu";
  }

  if (textLower.includes("tamil") || textLower.includes("kollywood")) {
    return "tamil";
  }

  if (textLower.includes("kannada") || textLower.includes("sandalwood")) {
    return "kannada";
  }

  if (textLower.includes("malayalam") || textLower.includes("mollywood")) {
    return "malayalam";
  }

  if (textLower.includes("punjabi")) {
    return "punjabi";
  }

  if (textLower.includes("bengali") || textLower.includes("tollywood")) {
    return "bengali";
  }

  return "unknown";
}

export function detectLanguageBatch(tracks: Track[]): Map<string, Language> {
  const map = new Map<string, Language>();
  for (const t of tracks) {
    if (!map.has(t.id)) {
      map.set(t.id, detectLanguage(t));
    }
  }
  return map;
}

export function getLanguageBoost(
  lang: Language,
  languageAffinities: Map<string, number>
): number {
  const affinity = languageAffinities.get(lang) ?? 0;

  switch (lang) {
    case "telugu":
      return 1.0 + Math.min(affinity * 0.1, 0.3);
    case "tamil":
    case "kannada":
    case "malayalam":
      return 0.5 + Math.min(affinity * 0.05, 0.15);
    case "english":
      return 0.2 + Math.min(affinity * 0.05, 0.2);
    case "punjabi":
    case "bengali":
      return 0.15 + Math.min(affinity * 0.05, 0.15);
    case "hindi":
      return 0.0 + Math.min(affinity * 0.02, 0.1);
    default:
      return 0.25;
  }
}

function detectScript(text: string): Language {
  for (const char of text) {
    const code = char.charCodeAt(0);
    for (const range of SCRIPT_RANGES) {
      if (code >= range.start && code <= range.end) {
        return range.lang;
      }
    }
  }
  return "unknown";
}

export function isTeluguTrack(track: Track): boolean {
  return detectLanguage(track) === "telugu";
}

export function getLanguageLabel(lang: Language): string {
  const labels: Record<Language, string> = {
    telugu: "తెలుగు",
    hindi: "हिन्दी",
    tamil: "தமிழ்",
    kannada: "ಕನ್ನಡ",
    malayalam: "മലയാളം",
    bengali: "বাংলা",
    punjabi: "ਪੰਜਾਬੀ",
    english: "English",
    unknown: "",
  };
  return labels[lang];
}

export function getTeluguSearchQueries(): string[] {
  return [
    "telugu songs",
    "telugu hits",
    "tollywood hits",
    "latest telugu songs",
    "telugu love songs",
    "telugu party songs",
    "telugu melody",
    "telugu item songs",
    "telugu mass songs",
    "telugu classical",
    "telugu folk songs",
    "telugu movie songs",
    "telugu dj songs",
    "telugu remix",
    "sp balasubrahmanyam",
    "devi sri prasad hits",
    "thaman s hits",
    "telugu 2024",
    "telugu 2025",
    "telugu 2026",
    "telugu trending",
    "telugu romantic",
  ];
}

export function shouldPreferTelugu(profile: {
  languageAffinities: Map<string, number>;
}): boolean {
  const teluguAff = profile.languageAffinities.get("telugu") ?? 0;
  if (teluguAff >= 1) return true;

  const totalListenCount = Array.from(profile.languageAffinities.values())
    .reduce((a, b) => a + b, 0);
  return totalListenCount === 0 || teluguAff > 0;
}
