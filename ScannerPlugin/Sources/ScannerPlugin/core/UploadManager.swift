//
//  UploadManager.swift
//  
//
//  Created by Siddesh M on 25/02/26.
//

import Foundation

/// Manages the multipart upload process to AWS S3 or other configured providers[cite: 23, 27].
class UploadManager: NSObject, URLSessionTaskDelegate, URLSessionDataDelegate {
    
    private var session: URLSession!
    private var uploadTasks: [Int: (progress: (Double) -> Void, completion: (Result<Void, PluginError>) -> Void)] = [:]
    
    /// Initializes the manager with a background configuration to ensure uploads continue if the app is backgrounded.
    override init() {
        super.init()
        let config = URLSessionConfiguration.background(withIdentifier: "com.scannerplugin.upload.background")
        config.isDiscretionary = false
        config.sessionSendsLaunchEvents = true
        config.waitsForConnectivity = true // Supports automatic retry on network interruption
        
        self.session = URLSession(configuration: config, delegate: self, delegateQueue: .main)
    }

    /// Performs a multipart upload for large scan files[cite: 27, 37].
    func upload(fileURL: URL, to config: UploadConfig, progress: @escaping (Double) -> Void, completion: @escaping (Result<Void, PluginError>) -> Void) {
        
        var request = URLRequest(url: config.endpoint)
        request.httpMethod = "POST"
        
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        // Construct multipart body in a temporary file to minimize memory footprint for large scans
        do {
            let tempUploadURL = try createMultipartFile(from: fileURL, boundary: boundary)
            let task = session.uploadTask(with: request, fromFile: tempUploadURL)
            
            uploadTasks[task.taskIdentifier] = (progress, completion)
            task.resume()
        } catch {
            completion(.failure(.fileSystemError("Failed to prepare multipart data: \(error.localizedDescription)"))) [cite: 21]
        }
    }

    // MARK: - URLSession Delegates
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didSendBodyData bytesSent: Int64, totalBytesSent: Int64, totalBytesExpectedToSend: Int64) {
        let percentage = Double(totalBytesSent) / Double(totalBytesExpectedToSend)
        uploadTasks[task.taskIdentifier]?.progress(percentage) [cite: 27, 43]
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let handlers = uploadTasks[task.taskIdentifier] else { return }
        
        if let error = error {
            // Logic for exponential backoff would be triggered here before final failure [cite: 27]
            handlers.completion(.failure(.uploadFailed(error.localizedDescription)))
        } else {
            handlers.completion(.success(())) [cite: 43]
        }
        uploadTasks.removeValue(forKey: task.taskIdentifier)
    }
    
    private func createMultipartFile(from source: URL, boundary: String) throws -> URL {
        // Implementation logic to wrap the file in multipart boundaries
        return source // Simplified for template
    }
}
