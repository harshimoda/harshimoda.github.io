import Foundation

/// Configuration for the cloud storage backend [cite: 22, 23]
public struct UploadConfig {
    /// The specific storage bucket name [cite: 25]
    public let bucket: String
    /// The AWS region for the bucket (e.g., "us-east-1") [cite: 25]
    public let region: String
    
    public init(bucket: String, region: String) {
        self.bucket = bucket
        self.region = region
    }
    
    /// Factory method for S3 configuration to keep the public API clean [cite: 23, 24, 25]
    public static func s3(bucket: String, region: String) -> UploadConfig {
        return UploadConfig(bucket: bucket, region: region)
    }
}//
//  UploadConfig.swift
//  ScannerPlugin
//
//  Created by Siddesh M on 25/02/26.
//

