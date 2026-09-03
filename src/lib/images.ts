import type { ScanImage, ScanImageRole } from './types'

export const MAX_SCAN_IMAGES = 5
export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_NORMALIZED_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_IMAGE_EDGE = 2048

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function validateImageSelection(files: File[], existingCount = 0): void {
    if (existingCount + files.length > MAX_SCAN_IMAGES) throw new Error(`Attach up to ${MAX_SCAN_IMAGES} images per scan.`)
    for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error('Images must be PNG, JPEG, or WebP files.')
        if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`)
    }
}

export function normalizedDimensions(width: number, height: number): { width: number; height: number } {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height))
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function imageRunLabel(names: string[]): string {
    if (names.length <= 1) return names[0] ?? 'Image scan'
    return `${names[0]} + ${names.length - 1} more`
}

function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(`Could not read ${file.name}.`))
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
        reader.readAsDataURL(file)
    })
}

function loadImage(dataUrl: string, name: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`Could not decode ${name}.`))
        image.src = dataUrl
    })
}

function dataUrlBytes(dataUrl: string): number {
    const payload = dataUrl.split(',', 2)[1] ?? ''
    return Math.ceil(payload.length * 3 / 4)
}

export async function normalizeImageFile(file: File, role: ScanImageRole): Promise<ScanImage> {
    validateImageSelection([file])
    const source = await readFile(file)
    const decoded = await loadImage(source, file.name)
    let { width, height } = normalizedDimensions(decoded.naturalWidth, decoded.naturalHeight)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error(`Could not process ${file.name}.`)
    let dataUrl = ''
    while (true) {
        canvas.width = width
        canvas.height = height
        context.drawImage(decoded, 0, 0, width, height)
        for (const quality of [0.85, 0.7, 0.55, 0.4]) {
            dataUrl = canvas.toDataURL('image/webp', quality)
            if (dataUrlBytes(dataUrl) <= MAX_NORMALIZED_IMAGE_BYTES) break
        }
        if (dataUrlBytes(dataUrl) <= MAX_NORMALIZED_IMAGE_BYTES) break
        if (width === 1 && height === 1) throw new Error(`${file.name} could not be reduced below 2 MB.`)
        width = Math.max(1, Math.floor(width * 0.8))
        height = Math.max(1, Math.floor(height * 0.8))
    }
    return {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        mimeType: 'image/webp',
        width,
        height,
        dataUrl,
        role,
    }
}

export async function normalizeImageFiles(files: File[], role: ScanImageRole, existingCount = 0): Promise<ScanImage[]> {
    validateImageSelection(files, existingCount)
    return Promise.all(files.map((file) => normalizeImageFile(file, role)))
}
