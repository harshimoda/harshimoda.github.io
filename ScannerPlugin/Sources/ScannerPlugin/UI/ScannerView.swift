import SwiftUI

public struct ScannerView: View {
    var onComplete: (URL) -> Void
    
    public init(onComplete: @escaping (URL) -> Void) {
        self.onComplete = onComplete
    }
    
    public var body: some View {
        VStack {
            Text("Scanner UI Placeholder")
            Button("Complete Scan") {
                // Mock URL for testing
                onComplete(URL(fileURLWithPath: "temp/scan.obj"))
            }
        }
    }
}
