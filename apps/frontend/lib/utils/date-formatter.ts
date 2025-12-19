import { format, formatDistanceToNow, formatRelative } from "date-fns";

/**
 * Format a date string or Date object to a relative time string
 * Examples: "2 hours ago", "3 days ago", "just now"
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "Never";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }

    // Use date-fns formatDistanceToNow for relative formatting
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "Unknown";
  }
}

/**
 * Format a date string or Date object to an absolute date string
 * Examples: "Jan 15, 2024", "Dec 3, 2023 at 2:30 PM"
 */
export function formatAbsoluteDate(
  date: string | Date | null | undefined,
  includeTime = false
): string {
  if (!date) return "Never";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }

    if (includeTime) {
      return format(dateObj, "MMM dd, yyyy 'at' h:mm a");
    }

    return format(dateObj, "MMM dd, yyyy");
  } catch (error) {
    console.error("Error formatting absolute date:", error);
    return "Unknown";
  }
}

/**
 * Format a date string or Date object intelligently:
 * - Recent dates (< 7 days): relative time ("2 hours ago")
 * - Older dates: absolute date ("Jan 15, 2024")
 */
export function formatDateSmart(
  date: string | Date | null | undefined,
  includeTime = false
): string {
  if (!date) return "Never";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }

    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If less than 7 days ago, use relative time
    if (diffInDays < 7 && diffInDays >= 0) {
      return formatRelativeTime(dateObj);
    }

    // Otherwise use absolute date
    return formatAbsoluteDate(dateObj, includeTime);
  } catch (error) {
    console.error("Error formatting date smart:", error);
    return "Unknown";
  }
}

/**
 * Format a date for display in tables/lists (compact format)
 * Examples: "Jan 15", "Dec 3, 2:30 PM"
 */
export function formatDateCompact(
  date: string | Date | null | undefined,
  includeTime = false
): string {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "-";
    }

    if (includeTime) {
      return format(dateObj, "MMM dd, h:mm a");
    }

    return format(dateObj, "MMM dd");
  } catch (error) {
    console.error("Error formatting compact date:", error);
    return "-";
  }
}
