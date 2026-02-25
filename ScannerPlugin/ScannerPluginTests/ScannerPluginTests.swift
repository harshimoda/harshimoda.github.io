//
//  ScannerPluginTests.swift
//  ScannerPlugin
//
//  Created by Siddesh M on 25/02/26.
//

import XCTest
@testable import ScannerPlugin

final class ScannerPluginTests: XCTestCase {
    
    var compressionManager: CompressionManager!
    
    override func setUp() {
        super.setUp()
        compressionManager = CompressionManager()
    }
    
    /// Verifies the Success Criteria: Compressed files must be at least 40% smaller
    func testDracoCompressionRatio() throws {
        // 1. Create dummy mesh data (simulating Task A/D) [cite: 18, 28]
        let originalString = String(repeating: "VertexData-Position-Normal-Texture", count: 1000)
        let originalData = Data(originalString.utf8)
        let originalSize = Double(originalData.count)
        
        // 2. Run through Draco optimization [cite: 30]
        let compressedData = try compressionManager.compressMesh(originalData)
        let compressedSize = Double(compressedData.count)
        
        // 3. Calculate reduction ratio
        let reduction = 1.0 - (compressedSize / originalSize)
        
        // 4. Assert 40% reduction target is met
        XCTAssertGreaterThanOrEqual(reduction, 0.40, "Compression failed to reach the 40% reduction target.")
    }
    
    /// Verifies Task B: Configuration validation on startup [cite: 25]
    func testInvalidConfigurationThrowsError() {
        // Test with empty bucket name to trigger validation logic [cite: 25]
        let invalidConfig = UploadConfig(bucket: "", region: "us-east-1")
        
        XCTAssertThrowsError(try ScannerPlugin.shared.configure(with: invalidConfig)) { error in
            // Ensure the error is a typed Swift error as required
            XCTAssertTrue(error is PluginError)
            if let pluginError = error as? PluginError {
                switch pluginError {
                case .invalidConfiguration:
                    XCTAssert(true)
                default:
                    XCTFail("Wrong error type thrown for invalid configuration.")
                }
            }
        }
    }
    
    /// Verifies Task C: Upload capability progress reporting
    func testUploadProgressLogic() {
        let expectation = XCTestExpectation(description: "Progress should be reported")
        let uploadManager = UploadManager()
        let config = UploadConfig.s3(bucket: "test-bucket", region: "us-east-1")
        
        // Mocking a file URL
        let fileURL = URL(fileURLWithPath: "/tmp/test.mesh")
        
        uploadManager.startUpload(fileURL: fileURL, config: config) { progress in
            if progress >= 0 {
                expectation.fulfill()
            }
        }
        
        // Note: Full integration testing for URLSession backgrounding requires an active environment [cite: 27, 34]
        wait(for: [expectation], timeout: 5.0)
    }
}
