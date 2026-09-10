const LAUNCH_HEADER_PREFIXES = ["x-launch-", "visitor-ip-"];

function isLaunchHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return LAUNCH_HEADER_PREFIXES.some((p) => lower.startsWith(p));
}

export interface HeaderSizeEntry {
  name: string;
  bytes: number;
}

export interface HeaderSizeBreakdown {
  launchHeaderKB: number;
  applicationHeaderKB: number;
  totalHeaderKB: number;
  largestHeader: HeaderSizeEntry | null;
  headers: HeaderSizeEntry[];
}

const toKB = (bytes: number) => Math.round((bytes / 1024) * 100) / 100;

// Mirrors the categorization in functions/[proxy].edge.js so every checkpoint's
// numbers are directly comparable: same "name: value\r\n" byte accounting, same
// launch/application split, same per-header ranking.
export function computeHeaderSizeBreakdown(headers: Headers): HeaderSizeBreakdown {
  let launchHeaderBytes = 0;
  let applicationHeaderBytes = 0;
  const entries: HeaderSizeEntry[] = [];

  headers.forEach((value, name) => {
    const bytes = name.length + value.length + 4; // "name: value\r\n"
    entries.push({ name, bytes });
    if (isLaunchHeader(name)) {
      launchHeaderBytes += bytes;
    } else {
      applicationHeaderBytes += bytes;
    }
  });

  entries.sort((a, b) => b.bytes - a.bytes);

  return {
    launchHeaderKB: toKB(launchHeaderBytes),
    applicationHeaderKB: toKB(applicationHeaderBytes),
    totalHeaderKB: toKB(launchHeaderBytes + applicationHeaderBytes),
    largestHeader: entries[0] ?? null,
    headers: entries,
  };
}
