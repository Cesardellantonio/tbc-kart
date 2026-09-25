// Copy a string to the clipboard. The async Clipboard API first; where it is missing or refused
// (plain http on a LAN IP, an older browser), select the text in its read-only field and try the
// legacy copy command — if that fails too, the text stays selected for the player to copy.
// Resolves 'copied' or 'selected'.

export async function copyText(text, field) {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // fall through to the selection
  }
  field.focus();
  field.select();
  field.setSelectionRange(0, text.length); // iOS ignores select() on its own
  try {
    if (document.execCommand('copy')) return 'copied';
  } catch {
    // deprecated and may throw: the selection is the fallback
  }
  return 'selected';
}
