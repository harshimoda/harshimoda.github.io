import Foundation
import ARKit
import RealityKit

/// Manages the 3D/2D capture process using the device camera
@MainActor
final class ScannerManager: NSObject, ARSessionDelegate {
    
    private let session = ARSession()
    private var capturedAnchors: [ARAnchor] = []
    
    func startCapture() {
        let configuration = ARWorldTrackingConfiguration()
        // Corrected logic for mesh support
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            configuration.sceneReconstruction = .mesh
        }
        session.delegate = self
        session.run(configuration)
    }
    
    func stopCapture(completion: @escaping (Result<URL, PluginError>) -> Void) {
        session.pause()
        
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".obj")
        
        do {
            try "Mesh Data Placeholder".write(to: tempURL, atomically: true, encoding: .utf8)
            completion(.success(tempURL))
        } catch {
            completion(.failure(.captureFailed("Failed to save raw scan file: \(error.localizedDescription)")))
        }
    }
}
