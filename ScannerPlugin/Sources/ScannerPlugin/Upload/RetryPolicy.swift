import Foundation

struct RetryPolicy {
    
    let maxAttempts = 3
    let baseDelay: TimeInterval = 2
    
    func execute<T>(
        operation: @escaping () async throws -> T
    ) async throws -> T {
        
        var attempt = 0
        
        while true {
            do {
                return try await operation()
            } catch {
                attempt += 1
                
                if attempt >= maxAttempts {
                    throw error
                }
                
                let delay = pow(2.0, Double(attempt)) * baseDelay
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
    }
}
