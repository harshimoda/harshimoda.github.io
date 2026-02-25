import SwiftUI

/// The primary entry point for the ScannerPlugin.
public final class ScannerPlugin {
    
    // Shared instance for easy access across the host app
    public static let shared = ScannerPlugin()
    
    private let uploadManager = UploadManager()
    private let compressionManager = DracoCompressor()
    private var configuration: UploadConfig?

    private init() {}

    /// 1. Configure the plugin (Standard S3 Support) [cite: 23, 25]
    /// This should be called in AppDelegate or the App's init.
    public func configure(with config: UploadConfig) throws {
        // Validate configuration on startup as required [cite: 25]
        guard !config.bucket.isEmpty, !config.region.isEmpty else {
            throw PluginError.invalidConfiguration("Bucket and Region must not be empty.")
        }
        self.configuration = config
    }

    /// 2. Launch the Scanning UI [cite: 21]
    /// Returns a view that encapsulates all camera and scanning logic.
    public func makeScannerView(
        onComplete: @escaping (URL) -> Void,
        onError: @escaping (PluginError) -> Void
    ) -> some View {
        // This encapsulates all scanning UI and camera access internally [cite: 21]
        ScannerViewControllerRepresentable(onComplete: onComplete, onError: onError)
    }

    /// 3. Process and Upload [cite: 27, 29]
    /// Handles optimization (Draco/HEIF) and cloud upload automatically.
    public func processAndUpload(
        fileURL: URL,
        progress: @escaping (Double) -> Void,
        completion: @escaping (Result<Void, PluginError>) -> Void
    ) {
        guard let config = configuration else {
            completion(.failure(.invalidConfiguration("Plugin not configured.")))
            return
        }

        // Perform compression on a background thread to reduce size by >40%
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let rawData = try Data(contentsOf: fileURL)
                let compressedData = try self.compressionManager.compress(meshData: rawData)
                
                // Save compressed data to a temporary file for background upload [cite: 27]
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
                try compressedData.write(to: tempURL)

                // Execute the multipart background upload [cite: 27, 34]
                self.uploadManager.upload(
                    fileURL: tempURL,
                    to: config,
                    progress: progress,
                    completion: completion
                )
            } catch let error as PluginError {
                completion(.failure(error))
            } catch {
                completion(.failure(.compressionFailed(error.localizedDescription)))
            }
        }
    }
}
