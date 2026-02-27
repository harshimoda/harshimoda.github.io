import Foundation

final class S3UploadService {
    
    private let provider: StorageProvider
    private let retryPolicy = RetryPolicy()
    
    weak var delegate: UploadProgressDelegate?
    
    init(provider: StorageProvider) {
        self.provider = provider
    }
    
    func upload(fileURL: URL) async throws -> URL {
        
        switch provider {
        case .s3(_, _, let presignedURLProvider):
            
            let uploadURL = try await presignedURLProvider(fileURL.lastPathComponent)
            
            return try await retryPolicy.execute {
                try await self.performUpload(to: uploadURL, fileURL: fileURL)
            }
        }
    }
    
    private func performUpload(
        to url: URL,
        fileURL: URL
    ) async throws -> URL {
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await URLSession.shared.upload(
            for: request,
            fromFile: fileURL
        )
        
        guard let http = response as? HTTPURLResponse,
              http.statusCode == 200 else {
            
            let errorString = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ S3 Upload Error:", errorString)
            throw URLError(.badServerResponse)
        }
        
        return url
    }
}
