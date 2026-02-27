//
//  DocumentPickerDelegate.swift
//  ScannerDemoApp
//
//  Created by Siddesh M on 26/02/26.
//
import UIKit

final class DocumentPickerDelegate: NSObject, UIDocumentPickerDelegate {
    
    private let onPick: (URL) -> Void
    
    init(onPick: @escaping (URL) -> Void) {
        self.onPick = onPick
    }
    
    func documentPicker(
        _ controller: UIDocumentPickerViewController,
        didPickDocumentsAt urls: [URL]
    ) {
        guard let url = urls.first else { return }
        onPick(url)
    }
}
