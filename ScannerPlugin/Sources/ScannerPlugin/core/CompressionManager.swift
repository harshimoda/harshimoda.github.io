import Foundation

final class CompressionManager {
    func compress(file: URL) async throws -> URL {
        // Ensure we are dealing with a mesh (e.g., .obj, .ply, .stl)
        let inputPath = file.path
        let outputPath = file.deletingLastPathComponent()
            .appendingPathComponent("compressed_\(UUID().uuidString).drc").path
        
        // Task D: Use Draco for mesh data
        // Using 11-14 bits for position is usually unnoticeable
        let success = compressMeshFile(inputPath, outputPath, 11)
        
        guard success else {
            throw PluginError.compressionFailed //
        }
        
        return URL(fileURLWithPath: outputPath)
    }
}
