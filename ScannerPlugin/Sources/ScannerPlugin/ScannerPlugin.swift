import Foundation

public actor ScannerPlugin {
    
    public static let shared = ScannerPlugin()
    
    private var uploadService: S3UploadService?
    
    public init() {}
    
    public func configure(provider: StorageProvider) {
        uploadService = S3UploadService(provider: provider)
    }
    
    public func setDelegate(_ delegate: UploadProgressDelegate) {
        uploadService?.delegate = delegate
    }
    
    public func uploadScan(fileURL: URL) async throws -> URL {
        
        guard let uploadService else {
            throw ScannerPluginError.notConfigured
        }
        
        let compressedURL = try await CompressionService.compressIfNeeded(fileURL)
        return try await uploadService.upload(fileURL: compressedURL)
    }
}

public enum ScannerPluginError: Error {
    case notConfigured
}
