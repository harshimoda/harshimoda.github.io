//
//  PluginError.swift
//  ScannerPlugin
//
//  Created by Siddesh M on 25/02/26.
//

import Foundation

/// Represents specific failure points within the ScannerPlugin workflow.
public enum PluginError: LocalizedError {
    /// Thrown when the provided S3 or storage configuration is missing or invalid[cite: 25, 34].
    case invalidConfiguration(String)
    
    /// Thrown when the camera or ARKit fails to initialize or capture data[cite: 21].
    case captureFailed(String)
    
    /// Thrown when Draco or image compression fails to meet optimization targets[cite: 30, 34].
    case compressionFailed(String)
    
    /// Thrown during the multipart upload process, including network interruptions.
    case uploadFailed(String)
    
    /// Thrown when the file system cannot handle the scan or compressed output[cite: 21].
    case fileSystemError(String)

    /// Provides a user-friendly description of the error for the host app.
    public var errorDescription: String? {
        switch self {
        case .invalidConfiguration(let reason):
            return "Configuration Error: \(reason)" [cite: 34]
        case .captureFailed(let reason):
            return "Capture Error: \(reason)" [cite: 34]
        case .compressionFailed(let reason):
            return "Optimization Error: \(reason)" [cite: 34]
        case .uploadFailed(let reason):
            return "Upload Error: \(reason)" [cite: 34]
        case .fileSystemError(let reason):
            return "File Error: \(reason)" [cite: 34]
        }
    }
}
