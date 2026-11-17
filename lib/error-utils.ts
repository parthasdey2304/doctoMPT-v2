/**
 * Sanitizes and formats raw API error strings, extracting clean messages from Google Cloud / Gemini JSON errors.
 */
export function formatErrorMessage(rawError: any): string {
  if (!rawError) return 'An unexpected error occurred.';

  const str = typeof rawError === 'string' ? rawError : rawError?.message || JSON.stringify(rawError);

  try {
    // If the error message is a stringified JSON object
    if (str.includes('{') && str.includes('}')) {
      const jsonStart = str.indexOf('{');
      const jsonEnd = str.lastIndexOf('}') + 1;
      const jsonSub = str.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonSub);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
      if (parsed?.message) {
        return parsed.message;
      }
    }
  } catch {
    // Ignore JSON parse error and fallback to string cleanup
  }

  return str.replace(/^Error:\s*/, '').trim();
}
