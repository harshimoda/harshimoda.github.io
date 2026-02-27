import SwiftUI
import UniformTypeIdentifiers
import ScannerPlugin
import UIKit

struct ContentView: View {
    
    @State private var progress: Double = 0
    @State private var isUploading = false
    @State private var message = ""
    @State private var documentDelegate: DocumentPickerDelegate?
    
    var body: some View {
        VStack(spacing: 20) {
            
            Text("Scanner Plugin Demo")
                .font(.title)
            
            if isUploading {
                ProgressView()
                    .padding()
            }
            
            Text(message)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
            
            Button("Pick .ply File & Upload") {
                pickFile()
            }
            .buttonStyle(.borderedProminent)
            
        }
        .padding()
        .onAppear {
            configurePlugin()
        }
    }
    
    // MARK: - Configure Plugin
    
    private func configurePlugin() {
        Task {
            await ScannerPlugin.shared.configure(
                provider: .s3(
                    bucket: "scan-s3-demo-bucket",
                    region: "eu-north-1"
                ) { fileName in
                    try await fetchPresignedURL(for: fileName)
                }
            )
        }
    }
    
    // MARK: - File Picker
    
    private func pickFile() {
        
        let picker = UIDocumentPickerViewController(
            forOpeningContentTypes: [
                UTType(filenameExtension: "ply") ?? .data
            ]
        )
        
        picker.allowsMultipleSelection = false
        
        let delegate = DocumentPickerDelegate { url in
            uploadFile(url)
        }
        
        picker.delegate = delegate
        documentDelegate = delegate   // keep strong reference
        
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first?
            .rootViewController?
            .present(picker, animated: true)
    }
    
    // MARK: - Upload
    
    private func uploadFile(_ url: URL) {

        guard url.startAccessingSecurityScopedResource() else {
            message = "Cannot access file"
            return
        }

        defer { url.stopAccessingSecurityScopedResource() }

        do {
            // Copy file to temp directory
            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent(url.lastPathComponent)

            if FileManager.default.fileExists(atPath: tempURL.path) {
                try FileManager.default.removeItem(at: tempURL)
            }

            try FileManager.default.copyItem(at: url, to: tempURL)

            // Check size
            let attributes = try FileManager.default.attributesOfItem(atPath: tempURL.path)
            let size = attributes[.size] as? NSNumber ?? 0
            print("📦 Copied file size:", size)

            isUploading = true
            message = "Uploading..."

            Task {
                do {
                    let remoteURL = try await ScannerPlugin.shared.uploadScan(fileURL: tempURL)

                    await MainActor.run {
                        isUploading = false
                        message = "Uploaded Successfully ✅"
                    }

                } catch {
                    await MainActor.run {
                        isUploading = false
                        message = "Upload Failed ❌\n\(error.localizedDescription)"
                    }
                }
            }

        } catch {
            message = "File copy failed"
        }
    }
    // MARK: - Backend Presign Call
    
    private func fetchPresignedURL(for fileName: String) async throws -> URL {
        
        guard let url = URL(string: "http://127.0.0.1:3000/presign") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["fileName": fileName]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let http = response as? HTTPURLResponse,
              http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        struct PresignResponse: Decodable {
            let url: String
        }
        
        let decoded = try JSONDecoder().decode(PresignResponse.self, from: data)
        
        guard let presignedURL = URL(string: decoded.url) else {
            throw URLError(.badURL)
        }
        
        return presignedURL
    }
}
