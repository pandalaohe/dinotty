import type { CaptureBasis, DrawCommand } from './previewImage'

export const ANNOTATION_STORAGE_KEY = 'dinotty:preview-annotations:v1'
export const MAX_ANNOTATION_COMMANDS = 100
export const MAX_ANNOTATION_BYTES = 64 * 1024

export interface AnnotationRecord {
  url: string
  basis: CaptureBasis
  commands: DrawCommand[]
  droppedCommands: number
}

function cloneCommands(commands: DrawCommand[]): DrawCommand[] {
  return commands.map((command) => ({ ...command, points: [...command.points] }))
}

function serializedBytes(record: AnnotationRecord): number {
  return new TextEncoder().encode(JSON.stringify(record)).byteLength
}

function boundedRecord(
  url: string,
  basis: CaptureBasis,
  sourceCommands: DrawCommand[],
  previouslyDropped = 0
): AnnotationRecord {
  const commands = cloneCommands(sourceCommands)
  let droppedCommands = previouslyDropped
  if (commands.length > MAX_ANNOTATION_COMMANDS) {
    const count = commands.length - MAX_ANNOTATION_COMMANDS
    commands.splice(0, count)
    droppedCommands += count
  }

  const record = { url, basis: { ...basis }, commands, droppedCommands }
  while (record.commands.length && serializedBytes(record) > MAX_ANNOTATION_BYTES) {
    record.commands.shift()
    record.droppedCommands++
  }
  return record
}

function validRecord(value: unknown): value is AnnotationRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<AnnotationRecord>
  return (
    typeof record.url === 'string' &&
    !!record.basis &&
    Number.isFinite(record.basis.documentWidthCss) &&
    Number.isFinite(record.basis.documentHeightCss) &&
    Number.isFinite(record.basis.capturedScale) &&
    Array.isArray(record.commands) &&
    record.commands.every(
      (command) =>
        !!command &&
        typeof command === 'object' &&
        Array.isArray(command.points) &&
        command.points.every(Number.isFinite)
    )
  )
}

export function canonicalPreviewUrl(value: string): string {
  try {
    const url = new URL(value, location.href)
    url.searchParams.delete('_t')
    return url.toString()
  } catch {
    return value.replace(/([?&])_t=[^&#]*(&?)/g, (_match, prefix: string, suffix: string) =>
      prefix === '?' && suffix ? '?' : suffix ? prefix : ''
    )
  }
}

export function createAnnotationRetentionStore() {
  let storage: Storage | undefined
  let record: AnnotationRecord | undefined
  let activeUrl = ''

  try {
    storage = window.sessionStorage
    const raw = storage.getItem(ANNOTATION_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (validRecord(parsed)) {
        record = boundedRecord(
          canonicalPreviewUrl(parsed.url),
          parsed.basis,
          parsed.commands,
          Number.isFinite(parsed.droppedCommands) ? parsed.droppedCommands : 0
        )
      }
    }
  } catch {
    storage = undefined
  }

  const persist = () => {
    if (!storage) return
    try {
      if (record) storage.setItem(ANNOTATION_STORAGE_KEY, JSON.stringify(record))
      else storage.removeItem(ANNOTATION_STORAGE_KEY)
    } catch {
      storage = undefined
    }
  }

  return {
    activate(value: string): AnnotationRecord | undefined {
      const url = canonicalPreviewUrl(value)
      if ((activeUrl && activeUrl !== url) || (record && record.url !== url)) {
        record = undefined
        persist()
      }
      activeUrl = url
      return record?.url === url
        ? { ...record, basis: { ...record.basis }, commands: cloneCommands(record.commands) }
        : undefined
    },

    read(value: string): AnnotationRecord | undefined {
      const url = canonicalPreviewUrl(value)
      return record?.url === url
        ? { ...record, basis: { ...record.basis }, commands: cloneCommands(record.commands) }
        : undefined
    },

    write(value: string, basis: CaptureBasis, commands: DrawCommand[]): AnnotationRecord {
      const url = canonicalPreviewUrl(value)
      activeUrl = url
      const dropped = record?.url === url ? record.droppedCommands : 0
      record = boundedRecord(url, basis, commands, dropped)
      persist()
      return { ...record, basis: { ...record.basis }, commands: cloneCommands(record.commands) }
    },

    clear(value: string, basis: CaptureBasis): AnnotationRecord {
      return this.write(value, basis, [])
    },
  }
}
