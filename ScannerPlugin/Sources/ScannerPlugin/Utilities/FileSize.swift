import Foundation

extension URL {
    
    public func fileSize() throws -> UInt64 {
        let values = try resourceValues(forKeys: [.fileSizeKey])
        guard let size = values.fileSize else {
            throw FileSizeError.unableToFetchSize
        }
        return UInt64(size)
    }
    
    public func formattedFileSize() throws -> String {
        let size = try fileSize()
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(size))
    }
}

enum FileSizeError: Error {
    case unableToFetchSize
}
