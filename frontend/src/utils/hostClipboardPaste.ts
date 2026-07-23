export const MULTILINE_CONFIRM_MS = 3000

export function stripTrailingNewlines(text: string): string {
  return text.replace(/[\r\n]+$/, '')
}

export function isMultilineText(text: string): boolean {
  return /[\r\n]/.test(text)
}

export function clipboardLineCount(text: string): number {
  return text.split(/\r\n|\r|\n/).length
}

export interface HostClipboardPasteOptions {
  fetchText: () => Promise<string>
  paste: (text: string) => void
  clipboardEmpty: () => void
  pasteFailed: () => void
  confirmMultiline: (lines: number) => void
  armedChanged: (armed: boolean, lines: number) => void
  confirmMs?: number
}

export function createHostClipboardPasteController(options: HostClipboardPasteOptions) {
  let cachedMultiline: string | null = null
  let clearTimer: ReturnType<typeof setTimeout> | null = null

  function disarm() {
    if (clearTimer) clearTimeout(clearTimer)
    clearTimer = null
    cachedMultiline = null
    options.armedChanged(false, 0)
  }

  async function trigger() {
    if (cachedMultiline !== null) {
      const text = cachedMultiline
      disarm()
      options.paste(text)
      return
    }

    let raw: string
    try {
      raw = await options.fetchText()
    } catch {
      options.pasteFailed()
      return
    }

    const text = stripTrailingNewlines(raw)
    if (!text) {
      options.clipboardEmpty()
      return
    }

    if (!isMultilineText(text)) {
      options.paste(text)
      return
    }

    const lines = clipboardLineCount(text)
    cachedMultiline = text
    options.armedChanged(true, lines)
    options.confirmMultiline(lines)
    clearTimer = setTimeout(disarm, options.confirmMs ?? MULTILINE_CONFIRM_MS)
  }

  return { trigger, dispose: disarm }
}
