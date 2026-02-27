import Foundation

public enum StorageProvider {
    
    case s3(
        bucket: String,
        region: String,
        presignedURLProvider: @Sendable (String) async throws -> URL
    )
}
