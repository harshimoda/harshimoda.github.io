//
//  ScanFile.swift
//  ScannerPlugin
//
//  Created by Siddesh M on 25/02/26.
//
import Foundation

/// Represents a physical object scan and its associated optimization state [cite: 8, 29]
public struct ScanFile {
    /// Unique identifier for the scan session
    public let id: UUID
    
    /// The local URL where the scan is temporarily stored
    public let localURL: URL
    
    /// The format of the scan (e.g., .obj, .usdz) [cite: 30]
    public let format: String
    
    /// Flag indicating if the file has been compressed via Draco or HEIF [cite: 28, 30]
    public var isOptimized: Bool
    
    /// The size of the file in bytes
    public var fileSize: Int64 {
        let attributes = try? FileManager.default.attributesOfItem(atPath: localURL.path)
        return attributes?[.size] as? Int64 ?? 0
    }
    
    public init(localURL: URL, format: String, isOptimized: Bool = false) {
        self.id = UUID()
        self.localURL = localURL
        self.format = format
        self.isOptimized = isOptimized
    }
}
