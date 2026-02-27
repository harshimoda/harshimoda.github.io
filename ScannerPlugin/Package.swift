// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ScannerPlugin",
    platforms: [
        .iOS(.v16)   // 🚨 MUST BE HERE
    ],
    products: [
        .library(
            name: "ScannerPlugin",
            targets: ["ScannerPlugin"]
        )
    ],
    targets: [
        .target(
            name: "ScannerPlugin",
            dependencies: []
        ),
        .testTarget(
            name: "ScannerPluginTests",
            dependencies: ["ScannerPlugin"]
        )
    ]
)
