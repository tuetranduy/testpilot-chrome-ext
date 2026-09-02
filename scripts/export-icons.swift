import AppKit
import Foundation

let fileManager = FileManager.default
let projectDirectory = URL(fileURLWithPath: fileManager.currentDirectoryPath, isDirectory: true)
let sourceURL = projectDirectory.appendingPathComponent("public/icons/testpilot.svg")
let outputDirectory = sourceURL.deletingLastPathComponent()
let iconSizes = [16, 32, 48, 128]

guard let sourceImage = NSImage(contentsOf: sourceURL) else {
    fputs("Could not load \(sourceURL.path)\n", stderr)
    exit(1)
}

for size in iconSizes {
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fputs("Could not create the \(size)px icon canvas\n", stderr)
        exit(1)
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.cgContext.clear(CGRect(x: 0, y: 0, width: size, height: size))
    context.imageInterpolation = .high
    sourceImage.draw(
        in: CGRect(x: 0, y: 0, width: size, height: size),
        from: .zero,
        operation: .copy,
        fraction: 1
    )
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()

    guard let png = bitmap.representation(using: .png, properties: [:]) else {
        fputs("Could not encode the \(size)px icon\n", stderr)
        exit(1)
    }

    let outputURL = outputDirectory.appendingPathComponent("icon-\(size).png")
    try png.write(to: outputURL, options: .atomic)
    print("Exported \(outputURL.path)")
}
