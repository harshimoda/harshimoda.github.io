import XCTest
@testable import ScannerPlugin

final class CompressionTests: XCTestCase {
    
    func testZipCompressionReducesSize() async throws {
        
        // Create temporary .ply test file
        let tempDirectory = FileManager.default.temporaryDirectory
        let originalURL = tempDirectory.appendingPathComponent("sample.ply")
        
        // Create fake large content
        let dummyData = Data(repeating: 0x41, count: 50_000) // 50 KB
        try dummyData.write(to: originalURL)
        
        // Compress
        let compressedURL = try await CompressionService.compressIfNeeded(originalURL)
        
        let originalSize = try originalURL.fileSize()
        let compressedSize = try compressedURL.fileSize()
        
        XCTAssertLessThan(compressedSize, originalSize)
        
        // Cleanup
        try? FileManager.default.removeItem(at: originalURL)
        try? FileManager.default.removeItem(at: compressedURL)
    }
}
