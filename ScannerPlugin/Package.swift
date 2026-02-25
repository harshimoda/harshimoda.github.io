// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ScannerPlugin",
    platforms: [
        .iOS(.v17) // Brief requires min iOS 16.0, but v17 is fine for modern features
    ],
    products: [
        .library(
            name: "ScannerPlugin",
            targets: ["ScannerPlugin"]
        )
    ],
    dependencies: [
        // Adding the Draco dependency as requested in Task D [cite: 30, 46]
        .package(url: "https://github.com/google/draco.git", branch: "master")
    ],
    targets: [
        .target(
            name: "ScannerPlugin",
            dependencies: [
                .product(name: "draco", package: "draco")
            ],
            path: "Sources/ScannerPlugin",
            swiftSettings: [
                // Required for Draco since it is a C++ library
                .interoperabilityMode(.Cxx)
            ]
        ),
        .testTarget(
            name: "ScannerPluginTests",
            dependencies: ["ScannerPlugin"]
        )
    ]
)
