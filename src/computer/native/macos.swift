// Engine-owned, in-memory desktop helper. Compile with the macOS 14+ SDK.
// stdin/stdout are private JSON-lines IPC; never log command arguments or captured content.
@preconcurrency import AppKit
import ApplicationServices
import CoreGraphics
import Foundation
import Darwin
@preconcurrency import ScreenCaptureKit

/// A protocol error deliberately containing no command arguments or captured content.
struct HelperError: Error {
    let message: String
    init(_ message: String) { self.message = message }
}

/// Thread-safe JSON output shared by asynchronous native callbacks and the stdin worker.
final class ProtocolOutput {
    private let lock = NSLock()
    func send(_ value: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) else { return }
        lock.lock()
        defer { lock.unlock() }
        do {
            try FileHandle.standardOutput.write(contentsOf: data)
            try FileHandle.standardOutput.write(contentsOf: Data([10]))
        } catch {
            // A broken parent connection must not leave input automation running.
            DispatchQueue.main.async { NSApplication.shared.terminate(nil) }
        }
    }
}

/// Primary display geometry. Screenshot output is normalized to these Quartz point coordinates.
struct PrimaryDisplay {
    let id: CGDirectDisplayID
    let bounds: CGRect
    var width: Int { Int(bounds.width.rounded()) }
    var height: Int { Int(bounds.height.rounded()) }
    var topology: String { "\(id):\(width)x\(height):\(Int(bounds.origin.x)),\(Int(bounds.origin.y))" }
    var metadata: [String: Any] {
        ["width": width, "height": height, "scaleFactor": 1, "topology": topology]
    }
    static func current() -> PrimaryDisplay {
        let id = CGMainDisplayID()
        return PrimaryDisplay(id: id, bounds: CGDisplayBounds(id))
    }
}

/// Native safety state is independent of the engine: a stalled engine cannot override a human takeover.
final class NativeState {
    let lock = NSRecursiveLock()
    var epoch: UInt64 = 0
    var observationEpoch: UInt64 = 0
    var lastHumanInputAt: TimeInterval = 0
    var lastHumanEventEmission: TimeInterval = 0
    var manualPaused = false
    var stopped = false
    var externalInput = false
    var externalObservation = false
    var indicatorVisible = false
    var sessionActive = true
    var tapAvailable = false
    var heldKeys = Set<CGKeyCode>()
    var heldButtons = Set<Int>()
    var project = ""
    var agent = ""
    var presentationState = "idle"
    func synchronized<T>(_ body: () throws -> T) rethrows -> T {
        lock.lock()
        defer { lock.unlock() }
        return try body()
    }
}

/// Event tagging prevents synthetic events from being mistaken for physical human activity.
let syntheticTag: Int64 = 0x5054424B434F4D50
let output = ProtocolOutput()
let safety = NativeState()

/// A click-through colored ring marks the agent's use of the shared system pointer honestly.
final class AgentCursorHalo: NSView {
    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.setFill()
        bounds.fill()
        let outer = NSBezierPath(ovalIn: bounds.insetBy(dx: 3, dy: 3))
        NSColor.white.withAlphaComponent(0.95).setStroke()
        outer.lineWidth = 6
        outer.stroke()
        NSColor.systemBlue.withAlphaComponent(0.95).setStroke()
        outer.lineWidth = 3
        outer.stroke()
        let center = NSBezierPath(ovalIn: NSRect(x: bounds.midX - 3, y: bounds.midY - 3, width: 6, height: 6))
        NSColor.systemBlue.setFill()
        center.fill()
    }
}

/// All native input is posted through one helper, preserving interruption and held-input accounting.
final class ComputerHelper: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private var panel: NSPanel!
    private var halo: NSPanel!
    private var cursorTimer: Timer?
    private var label: NSTextField!
    private var pauseButton: NSButton!
    private var tap: CFMachPort?
    private var tapSource: CFRunLoopSource?
    private var watchdog: Timer?
    private var signals: [DispatchSourceSignal] = []
    private let work = DispatchQueue(label: "io.ptbk.computer.native", qos: .userInitiated)
    private let eventSource = CGEventSource(stateID: .hidSystemState)

    /// Start private IPC and safety monitoring while leaving the idle desktop untouched.
    func applicationDidFinishLaunching(_ notification: Notification) {
        makeIndicator()
        installEventTap()
        installSessionObservers()
        installSignalHandlers()
        cursorTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60, repeats: true) { [weak self] _ in self?.updateCursorHalo() }
        watchdog = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in self?.watchSafety() }
        DispatchQueue.global(qos: .utility).async { [weak self] in
            while let line = readLine(strippingNewline: true) {
                // Bound malformed input without echoing it or retaining a payload in an error.
                guard line.utf8.count <= 4 * 1_024 * 1_024,
                      let data = line.data(using: .utf8),
                      let command = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
                    output.send(["id": NSNull(), "error": "Invalid helper request."])
                    continue
                }
                DispatchQueue.main.async { self?.receive(command) }
            }
            DispatchQueue.main.async {
                self?.cancelAndRelease()
                NSApplication.shared.terminate(nil)
            }
        }
    }

    /// Drop monitoring and release held synthetic inputs on normal process termination.
    func applicationWillTerminate(_ notification: Notification) {
        cancelAndRelease()
        watchdog?.invalidate()
        cursorTimer?.invalidate()
        halo?.orderOut(nil)
        for source in signals { source.cancel() }
        if let tap { CGEvent.tapEnable(tap: tap, enable: false) }
        if let tapSource { CFRunLoopRemoveSource(CFRunLoopGetMain(), tapSource, .commonModes) }
    }

    /// Graceful process termination releases the helper's synthetic input before exiting.
    private func installSignalHandlers() {
        for number in [SIGTERM, SIGINT, SIGHUP] {
            signal(number, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: number, queue: .main)
            source.setEventHandler { [weak self] in
                self?.cancelAndRelease()
                NSApplication.shared.terminate(nil)
            }
            source.resume()
            signals.append(source)
        }
    }

    /// The always-visible nonactivating panel never takes keyboard focus from the user's application.
    private func makeIndicator() {
        let screen = NSScreen.screens.first?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1_024, height: 768)
        panel = NSPanel(contentRect: NSRect(x: screen.midX - 270, y: screen.maxY - 90, width: 540, height: 56),
                        styleMask: [.titled, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.title = "Promptbook · Computer Control"
        panel.level = .floating
        panel.isFloatingPanel = true
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isMovableByWindowBackground = true
        panel.delegate = self
        let container = NSView(frame: NSRect(x: 0, y: 0, width: 540, height: 56))
        label = NSTextField(labelWithString: "Waiting for engine · input disabled")
        label.frame = NSRect(x: 12, y: 17, width: 320, height: 22)
        label.lineBreakMode = .byTruncatingTail
        label.maximumNumberOfLines = 1
        label.toolTip = "The system pointer is shared. Physical input always takes priority."
        pauseButton = NSButton(title: "Pause", target: self, action: #selector(togglePause))
        pauseButton.frame = NSRect(x: 340, y: 12, width: 86, height: 30)
        pauseButton.bezelStyle = .rounded
        let stop = NSButton(title: "Stop", target: self, action: #selector(emergencyStop))
        stop.frame = NSRect(x: 433, y: 12, width: 91, height: 30)
        stop.bezelStyle = .rounded
        stop.contentTintColor = .systemRed
        container.addSubview(label)
        container.addSubview(pauseButton)
        container.addSubview(stop)
        panel.contentView = container
        // Capability/status queries start quietly. Only an attributed active lease shows the bar.
        safety.synchronized { safety.indicatorVisible = false }
        halo = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 34, height: 34),
                       styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        halo.isOpaque = false
        halo.backgroundColor = .clear
        halo.hasShadow = false
        halo.ignoresMouseEvents = true
        halo.hidesOnDeactivate = false
        halo.level = .statusBar
        halo.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        halo.contentView = AgentCursorHalo(frame: NSRect(x: 0, y: 0, width: 34, height: 34))
    }

    /// Mirror actual pointer movement without stealing focus or implying a second independent OS cursor.
    private func updateCursorHalo() {
        let active = safety.synchronized {
            safety.externalInput && safety.indicatorVisible && safety.tapAvailable && safety.sessionActive
                && !safety.manualPaused && !safety.stopped && Date().timeIntervalSince1970 - safety.lastHumanInputAt >= 5
        }
        guard active, let halo, let screen = NSScreen.screens.first, let point = CGEvent(source: nil)?.location,
              PrimaryDisplay.current().bounds.contains(point) else { halo?.orderOut(nil); return }
        halo.setFrameOrigin(NSPoint(x: screen.frame.minX + point.x - 17, y: screen.frame.maxY - point.y - 17))
        halo.orderFrontRegardless()
    }

    /// Listen-only input monitoring never blocks physical input or changes its destination.
    private func installEventTap() {
        if let tap, CGEvent.tapIsEnabled(tap: tap) {
            safety.synchronized { safety.tapAvailable = true }
            return
        }
        if let tapSource { CFRunLoopRemoveSource(CFRunLoopGetMain(), tapSource, .commonModes) }
        tapSource = nil
        tap = nil
        guard AXIsProcessTrusted() && CGPreflightListenEventAccess() else {
            safety.synchronized { safety.tapAvailable = false }
            return
        }
        let kinds: [CGEventType] = [.keyDown, .keyUp, .flagsChanged, .mouseMoved, .leftMouseDown, .leftMouseUp,
                                   .rightMouseDown, .rightMouseUp, .otherMouseDown, .otherMouseUp,
                                   .leftMouseDragged, .rightMouseDragged, .otherMouseDragged, .scrollWheel]
        let mask = kinds.reduce(CGEventMask(0)) { $0 | (CGEventMask(1) << $1.rawValue) }
        let context = Unmanaged.passUnretained(self).toOpaque()
        tap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly,
                               eventsOfInterest: mask, callback: { _, type, event, userInfo in
            guard let userInfo else { return Unmanaged.passUnretained(event) }
            let owner = Unmanaged<ComputerHelper>.fromOpaque(userInfo).takeUnretainedValue()
            if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                owner.monitorLost()
                return Unmanaged.passUnretained(event)
            }
            if event.getIntegerValueField(.eventSourceUserData) != syntheticTag {
                owner.physicalInput()
            }
            return Unmanaged.passUnretained(event)
        }, userInfo: context)
        if let tap {
            tapSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
            if let tapSource {
                CFRunLoopAddSource(CFRunLoopGetMain(), tapSource, .commonModes)
                CGEvent.tapEnable(tap: tap, enable: true)
            }
        }
        safety.synchronized { safety.tapAvailable = tap != nil && tapSource != nil }
    }

    /// Loss of monitoring disarms all automation until the native monitor has recovered.
    private func monitorLost() {
        safety.synchronized { safety.tapAvailable = false }
        cancelAndRelease()
        output.send(["event": "unavailable", "reason": "Human-input monitoring stopped."])
        if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
    }

    /// Human activity cancels the current operation and keeps automation quiet until five seconds of idle.
    private func physicalInput() {
        let now = Date().timeIntervalSince1970
        let emit = safety.synchronized { () -> Bool in
            safety.lastHumanInputAt = now
            let shouldEmit = now - safety.lastHumanEventEmission >= 0.05
            if shouldEmit { safety.lastHumanEventEmission = now }
            return shouldEmit
        }
        cancelAndRelease(invalidateObservation: false)
        if emit { output.send(["event": "human-input", "at": Int64(now * 1_000)]) }
        updatePresentation()
    }

    /// The AppKit panel and login-session transitions are independent of any open Promptbook Console.
    private func installSessionObservers() {
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(sessionUnavailable),
                                                         name: NSWorkspace.sessionDidResignActiveNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(sessionUnavailable),
                                                         name: NSWorkspace.willSleepNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(sessionReturned),
                                                         name: NSWorkspace.sessionDidBecomeActiveNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(sessionReturned),
                                                         name: NSWorkspace.didWakeNotification, object: nil)
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(sessionUnavailable),
                                                            name: NSNotification.Name("com.apple.screenIsLocked"), object: nil)
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(sessionReturned),
                                                            name: NSNotification.Name("com.apple.screenIsUnlocked"), object: nil)
    }

    /// Invalidate all prior commands when the session stops being interactive.
    @objc private func sessionUnavailable(_ notification: Notification) {
        safety.synchronized { safety.sessionActive = false }
        cancelAndRelease()
        output.send(["event": "unavailable", "reason": "The desktop session is locked, inactive or sleeping."])
    }

    /// Returning to the desktop never releases a manual pause or replays stale input.
    @objc private func sessionReturned(_ notification: Notification) {
        // Never replay inputs queued before sleep/unlock, or clear an explicit human pause.
        safety.synchronized { safety.sessionActive = true; safety.epoch &+= 1; safety.observationEpoch &+= 1 }
        updatePresentation()
    }

    /// Query the actual WindowServer session; a background service cannot control a locked login.
    private func sessionIsUsable() -> Bool {
        guard let session = CGSessionCopyCurrentDictionary() as? [String: Any] else { return false }
        let onConsole = session[kCGSessionOnConsoleKey as String] as? Bool ?? false
        let locked = session["CGSSessionScreenIsLocked"] as? Bool ?? false
        return onConsole && !locked && safety.synchronized { safety.sessionActive }
    }

    /// Losing the visible indicator fails closed; a hidden panel can never leave inputs running.
    private func watchSafety() {
        let visible = panel != nil && panel.isVisible && !NSApplication.shared.isHidden
        let hadVisible = safety.synchronized { () -> Bool in
            let previous = safety.indicatorVisible
            safety.indicatorVisible = visible
            return previous
        }
        let expectedVisible = safety.synchronized { safety.externalObservation }
        if !visible && hadVisible && expectedVisible {
            safety.synchronized { safety.stopped = true }
            cancelAndRelease()
            output.send(["event": "unavailable", "reason": "The Computer Control indicator is no longer visible."])
        }
        let monitoring = tap.map { CGEvent.tapIsEnabled(tap: $0) } ?? false
        let lost = safety.synchronized { () -> Bool in
            let previous = safety.tapAvailable
            safety.tapAvailable = monitoring
            return previous && !monitoring
        }
        if lost { monitorLost() }
        if !sessionIsUsable() { cancelAndRelease() }
        updatePresentation()
    }

    /// The native human takeover stays latched independently of engine presentation updates.
    @objc private func togglePause() {
        let paused = safety.synchronized { () -> Bool in
            if safety.stopped { return true }
            safety.manualPaused.toggle()
            return safety.manualPaused
        }
        cancelAndRelease()
        output.send(["event": paused ? "pause" : "resume"])
        updatePresentation()
    }

    /// A native emergency stop cancels real input without waiting for any engine response.
    @objc private func emergencyStop() {
        safety.synchronized { safety.stopped = true }
        cancelAndRelease()
        output.send(["event": "stop"])
        updatePresentation()
    }

    /// Update the attributed native bar without activating the helper or changing keyboard focus.
    private func updatePresentation() {
        if !Thread.isMainThread {
            DispatchQueue.main.async { [weak self] in self?.updatePresentation() }
            return
        }
        let text = safety.synchronized { () -> String in
            let identity = [safety.project, safety.agent].filter { !$0.isEmpty }.joined(separator: " · ")
            let state: String
            if safety.stopped { state = "Stopped" }
            else if safety.manualPaused { state = "Paused · observing disabled" }
            else if Date().timeIntervalSince1970 - safety.lastHumanInputAt < 5 { state = "Human control" }
            else { state = safety.presentationState }
            pauseButton.title = safety.manualPaused ? "Resume" : "Pause"
            pauseButton.isEnabled = !safety.stopped
            return identity.isEmpty ? "\(state) · input disabled" : "\(identity) · \(state)"
        }
        label.stringValue = text
    }

    /// Control commands bypass the serial action queue so stop/pause can interrupt a long movement immediately.
    private func receive(_ command: [String: Any]) {
        let id = command["id"] ?? NSNull()
        guard let op = command["op"] as? String else {
            output.send(["id": id, "error": "Missing helper operation."])
            return
        }
        if op == "indicator" {
            let state = command["state"] as? String ?? "idle"
            safety.synchronized {
                safety.project = String((command["project"] as? String ?? "").prefix(160))
                safety.agent = String((command["agent"] as? String ?? "").prefix(160))
                safety.presentationState = state
                safety.externalInput = state == "active" && !safety.project.isEmpty && !safety.agent.isEmpty
                safety.externalObservation = (state == "active" || state == "human-paused") && !safety.project.isEmpty && !safety.agent.isEmpty
            }
            let shouldShow = state != "idle" && state != "disabled"
            if shouldShow { panel.orderFrontRegardless() } else { panel.orderOut(nil) }
            safety.synchronized { safety.indicatorVisible = shouldShow && panel.isVisible }
            if state != "active" { cancelAndRelease(invalidateObservation: state != "human-paused") }
            updatePresentation()
            output.send(["id": id, "result": ["visible": shouldShow && panel.isVisible]])
            return
        }
        if op == "releaseInputs" {
            cancelAndRelease(invalidateObservation: false)
            output.send(["id": id, "result": ["released": true]])
            return
        }
        if op == "pause" || op == "stop" || op == "resume" {
            safety.synchronized {
                if op == "pause" { safety.manualPaused = true }
                if op == "stop" { safety.stopped = true }
                if op == "resume" { safety.manualPaused = false; safety.stopped = false }
            }
            cancelAndRelease()
            updatePresentation()
            output.send(["id": id, "result": status()])
            return
        }
        if op == "close" {
            safety.synchronized { safety.stopped = true }
            cancelAndRelease()
            output.send(["id": id, "result": ["closed": true]])
            NSApplication.shared.terminate(nil)
            return
        }
        if op == "status" || op == "permissions" {
            if op == "permissions" {
                _ = AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary)
                _ = CGRequestScreenCaptureAccess()
                _ = CGRequestListenEventAccess()
            }
            installEventTap()
            output.send(["id": id, "result": status()])
            return
        }
        let observation = ["screenshot", "clipboardRead", "accessibility"].contains(op)
        let epoch = safety.synchronized { observation ? safety.observationEpoch : safety.epoch }
        work.async { [weak self] in
            guard let self else { return }
            do {
                let result = try self.perform(op, command, epoch)
                output.send(["id": id, "result": result])
            } catch {
                self.cancelAndRelease()
                let message = (error as? HelperError)?.message ?? "Native desktop operation failed."
                output.send(["id": id, "error": message])
            }
        }
    }

    /// Status reports capability truthfully; it does not capture the screen or request new permissions.
    private func status() -> [String: Any] {
        let accessibility = AXIsProcessTrusted()
        let screen = CGPreflightScreenCaptureAccess()
        let monitor = safety.synchronized { safety.tapAvailable }
        let session = sessionIsUsable()
        let context = currentContext()
        let available = accessibility && screen && monitor && session && context != "unavailable"
        var result: [String: Any] = [
            "supported": true, "available": available,
            "accessibility": accessibility, "screenRecording": screen,
            "inputMonitoring": monitor, "cursor": "shared",
            "primaryScreen": PrimaryDisplay.current().metadata, "context": context,
            "lastHumanInputAt": safety.synchronized { Int64(safety.lastHumanInputAt * 1_000) },
            "isPaused": safety.synchronized { safety.manualPaused },
            "isStopped": safety.synchronized { safety.stopped }
        ]
        if !available {
            result["reason"] = !session ? "An active unlocked desktop session is required."
                : !accessibility ? "Allow Accessibility for the Promptbook native helper in System Settings."
                : !screen ? "Allow Screen Recording for the Promptbook native helper in System Settings."
                : !monitor ? "Allow Input Monitoring for the Promptbook native helper in System Settings."
                : "The foreground application could not be verified. Observe the desktop again before controlling it."
        }
        return result
    }

    /// An opaque focus identity contains no window title or editable content.
    private func currentContext() -> String {
        let system = AXUIElementCreateSystemWide()
        AXUIElementSetMessagingTimeout(system, 0.15)
        var focusedApp: CFTypeRef?
        guard AXUIElementCopyAttributeValue(system, kAXFocusedApplicationAttribute as CFString, &focusedApp) == .success,
              let focusedApp, CFGetTypeID(focusedApp) == AXUIElementGetTypeID() else { return "unavailable" }
        let app = unsafeBitCast(focusedApp, to: AXUIElement.self)
        AXUIElementSetMessagingTimeout(app, 0.15)
        var pid: pid_t = 0
        guard AXUIElementGetPid(app, &pid) == .success else { return "unavailable" }
        var focusedWindow: CFTypeRef?
        if AXUIElementCopyAttributeValue(app, kAXFocusedWindowAttribute as CFString, &focusedWindow) == .success,
           let focusedWindow, CFGetTypeID(focusedWindow) == AXUIElementGetTypeID() {
            return "\(pid):\(CFHash(focusedWindow))"
        }
        return "\(pid):no-window"
    }

    /// In-flight commands become invalid on human input, indicator changes, stop, sleep or releaseInputs.
    private func ensureAllowed(_ epoch: UInt64, input: Bool, topology: String? = nil) throws {
        try safety.synchronized {
            guard epoch == (input ? safety.epoch : safety.observationEpoch) else { throw HelperError("Desktop operation was interrupted; observe the current state before retrying.") }
            guard !safety.manualPaused && !safety.stopped && safety.indicatorVisible && safety.sessionActive else {
                throw HelperError("Computer Control is paused, stopped or unavailable.")
            }
            guard safety.externalObservation else { throw HelperError("Desktop observation is not active.") }
            guard !input || (safety.externalInput && safety.tapAvailable) else {
                throw HelperError("Desktop input is not active or human-input monitoring is unavailable.")
            }
            guard !input || Date().timeIntervalSince1970 - safety.lastHumanInputAt >= 5 else {
                throw HelperError("Human input has priority; wait for five seconds of idle and observe again.")
            }
        }
        guard sessionIsUsable() else { throw HelperError("The desktop session is locked or inactive.") }
        guard AXIsProcessTrusted() else { throw HelperError("Accessibility permission is required.") }
        if let topology, topology != PrimaryDisplay.current().topology {
            throw HelperError("The primary display changed; take a fresh screenshot before using coordinates.")
        }
    }

    /// Release only inputs posted by this helper; never synthesize releases for physical user keys.
    private func cancelAndRelease(invalidateObservation: Bool = true) {
        safety.synchronized {
            safety.epoch &+= 1
            if invalidateObservation { safety.observationEpoch &+= 1 }
            let keys = safety.heldKeys
            let buttons = safety.heldButtons
            safety.heldKeys.removeAll()
            safety.heldButtons.removeAll()
            for key in keys {
                if let event = CGEvent(keyboardEventSource: eventSource, virtualKey: key, keyDown: false) { postUnconditionally(event) }
            }
            let point = CGEvent(source: nil)?.location ?? .zero
            for button in buttons {
                let kind: CGEventType = button == 0 ? .leftMouseUp : button == 1 ? .rightMouseUp : .otherMouseUp
                if let mouseButton = CGMouseButton(rawValue: UInt32(button)),
                   let event = CGEvent(mouseEventSource: eventSource, mouseType: kind, mouseCursorPosition: point, mouseButton: mouseButton) {
                    postUnconditionally(event)
                }
            }
        }
    }

    /// Cleanup releases bypass the input gate but remain marked as synthetic helper events.
    private func postUnconditionally(_ event: CGEvent) {
        event.setIntegerValueField(.eventSourceUserData, value: syntheticTag)
        event.post(tap: .cghidEventTap)
    }

    /// Validate the native safety state immediately before posting each real input event.
    private func post(_ event: CGEvent, epoch: UInt64, topology: String) throws {
        try safety.synchronized {
            try ensureAllowed(epoch, input: true, topology: topology)
            postUnconditionally(event)
        }
    }

    /// Validate coordinates without silently moving a command onto a different monitor.
    private func target(_ command: [String: Any], display: PrimaryDisplay) throws -> CGPoint {
        guard let x = command["x"] as? Double, let y = command["y"] as? Double,
              x.isFinite, y.isFinite, x >= 0, y >= 0, x < Double(display.width), y < Double(display.height) else {
            throw HelperError("Coordinates must be inside the current primary display.")
        }
        return CGPoint(x: display.bounds.origin.x + CGFloat(x), y: display.bounds.origin.y + CGFloat(y))
    }

    /// Reject unbounded or instantaneous movement; the caller observes genuine intermediate events.
    private func duration(_ command: [String: Any]) throws -> TimeInterval {
        let milliseconds = command["durationMs"] as? Double ?? 300
        guard milliseconds.isFinite, milliseconds >= 50, milliseconds <= 10_000 else {
            throw HelperError("Movement duration must be between 50 and 10000 milliseconds.")
        }
        return milliseconds / 1_000
    }

    /// Smoothstep interpolation posts real intermediate Quartz events, checking interruption every frame.
    private func move(to target: CGPoint, duration: TimeInterval, epoch: UInt64, display: PrimaryDisplay) throws {
        guard let start = CGEvent(source: nil)?.location else { throw HelperError("Unable to read the current pointer position.") }
        guard display.bounds.contains(start) else { throw HelperError("The current pointer is outside the supported primary display.") }
        let started = ProcessInfo.processInfo.systemUptime
        while true {
            let progress = min(1, (ProcessInfo.processInfo.systemUptime - started) / duration)
            let eased = progress * progress * (3 - 2 * progress)
            let point = CGPoint(x: start.x + (target.x - start.x) * CGFloat(eased), y: start.y + (target.y - start.y) * CGFloat(eased))
            let held = safety.synchronized { safety.heldButtons.sorted().first }
            let kind: CGEventType = held == 0 ? .leftMouseDragged : held == 1 ? .rightMouseDragged : held != nil ? .otherMouseDragged : .mouseMoved
            let button = CGMouseButton(rawValue: UInt32(held ?? 0)) ?? .left
            guard let event = CGEvent(mouseEventSource: eventSource, mouseType: kind, mouseCursorPosition: point, mouseButton: button) else {
                throw HelperError("Unable to create a native pointer event.")
            }
            try post(event, epoch: epoch, topology: display.topology)
            if progress >= 1 { break }
            Thread.sleep(forTimeInterval: 1.0 / 120)
        }
    }

    /// Translate the three supported primary pointer buttons.
    private func buttonCode(_ value: Any?) throws -> Int {
        switch (value as? String ?? "left").lowercased() {
        case "left": return 0
        case "right": return 1
        case "middle": return 2
        default: throw HelperError("Mouse button must be left, right or middle.")
        }
    }

    /// Account for synthetic held buttons so interruptions can always release them.
    private func mouseButton(_ code: Int, down: Bool, count: Int = 1, epoch: UInt64, display: PrimaryDisplay) throws {
        guard let point = CGEvent(source: nil)?.location,
              let button = CGMouseButton(rawValue: UInt32(code)) else { throw HelperError("Unable to read pointer state.") }
        guard display.bounds.contains(point) else { throw HelperError("The current pointer is outside the supported primary display.") }
        let kind: CGEventType = code == 0 ? (down ? .leftMouseDown : .leftMouseUp)
            : code == 1 ? (down ? .rightMouseDown : .rightMouseUp) : (down ? .otherMouseDown : .otherMouseUp)
        guard let event = CGEvent(mouseEventSource: eventSource, mouseType: kind, mouseCursorPosition: point, mouseButton: button) else {
            throw HelperError("Unable to create a native mouse event.")
        }
        event.setIntegerValueField(.mouseEventClickState, value: Int64(count))
        try safety.synchronized {
            try ensureAllowed(epoch, input: true, topology: display.topology)
            if down { safety.heldButtons.insert(code) } else { safety.heldButtons.remove(code) }
            postUnconditionally(event)
        }
    }

    /// Keys are explicit physical key names; arbitrary Unicode belongs to the separate type operation.
    private func keyCode(_ name: String) throws -> (CGKeyCode, CGEventFlags) {
        let key = name.lowercased().replacingOccurrences(of: "_l", with: "").replacingOccurrences(of: "_r", with: "")
        let modifiers: [String: (CGKeyCode, CGEventFlags)] = [
            "cmd": (55, .maskCommand), "command": (55, .maskCommand), "meta": (55, .maskCommand), "super": (55, .maskCommand),
            "ctrl": (59, .maskControl), "control": (59, .maskControl), "shift": (56, .maskShift),
            "alt": (58, .maskAlternate), "option": (58, .maskAlternate)
        ]
        if let modifier = modifiers[key] { return modifier }
        let codes: [String: CGKeyCode] = [
            "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9, "b": 11,
            "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21,
            "6": 22, "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28, "0": 29, "]": 30, "o": 31,
            "u": 32, "[": 33, "i": 34, "p": 35, "return": 36, "enter": 36, "l": 37, "j": 38, "'": 39,
            "k": 40, ";": 41, "\\": 42, ",": 43, "/": 44, "n": 45, "m": 46, ".": 47, "tab": 48,
            "space": 49, " ": 49, "`": 50, "backspace": 51, "escape": 53, "esc": 53, "capslock": 57,
            "f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97, "f7": 98, "f8": 100,
            "f9": 101, "f10": 109, "f11": 103, "f12": 111, "f13": 105, "f14": 107, "f15": 113,
            "f16": 106, "f17": 64, "f18": 79, "f19": 80, "f20": 90, "home": 115, "end": 119,
            "pageup": 116, "pagedown": 121, "delete": 117, "forwarddelete": 117,
            "left": 123, "arrowleft": 123, "right": 124, "arrowright": 124, "down": 125, "arrowdown": 125,
            "up": 126, "arrowup": 126
        ]
        guard let code = codes[key] else { throw HelperError("Unsupported physical key name; use the type operation for Unicode text.") }
        return (code, [])
    }

    /// Send a short key chord with bounded dwell times and reversible held-key accounting.
    private func pressKeys(_ names: [String], epoch: UInt64, display: PrimaryDisplay) throws {
        guard !names.isEmpty && names.count <= 8 else { throw HelperError("A key chord must contain one to eight keys.") }
        let keys = try names.map { try keyCode($0) }
        var flags = CGEventFlags()
        for (code, modifier) in keys {
            flags.formUnion(modifier)
            guard let event = CGEvent(keyboardEventSource: eventSource, virtualKey: code, keyDown: true) else {
                throw HelperError("Unable to create a native keyboard event.")
            }
            event.flags = flags
            try safety.synchronized {
                try ensureAllowed(epoch, input: true, topology: display.topology)
                safety.heldKeys.insert(code)
                postUnconditionally(event)
            }
            Thread.sleep(forTimeInterval: 0.012)
        }
        for (code, modifier) in keys.reversed() {
            flags.subtract(modifier)
            guard let event = CGEvent(keyboardEventSource: eventSource, virtualKey: code, keyDown: false) else {
                throw HelperError("Unable to create a native keyboard event.")
            }
            event.flags = flags
            try safety.synchronized {
                try ensureAllowed(epoch, input: true, topology: display.topology)
                safety.heldKeys.remove(code)
                postUnconditionally(event)
            }
        }
    }

    /// Post Unicode without borrowing or exposing the user clipboard.
    private func typeText(_ text: String, epoch: UInt64, display: PrimaryDisplay) throws {
        guard text.utf8.count <= 1_000_000 else { throw HelperError("Text exceeds the native typing limit.") }
        // Individual scalar events keep interruption responsive and avoid splitting surrogate pairs.
        for scalar in text.unicodeScalars {
            let units = Array(String(scalar).utf16)
            for down in [true, false] {
                guard let event = CGEvent(keyboardEventSource: eventSource, virtualKey: 0, keyDown: down) else {
                    throw HelperError("Unable to create a native Unicode event.")
                }
                units.withUnsafeBufferPointer { buffer in
                    if let address = buffer.baseAddress { event.keyboardSetUnicodeString(stringLength: units.count, unicodeString: address) }
                }
                try safety.synchronized {
                    try ensureAllowed(epoch, input: true, topology: display.topology)
                    if down { safety.heldKeys.insert(0) } else { safety.heldKeys.remove(0) }
                    postUnconditionally(event)
                }
            }
            Thread.sleep(forTimeInterval: 0.001)
        }
    }

    /// Invoke AppKit-only APIs without stopping the main event loop during native input or screenshot work.
    private func onMain<T>(_ operation: () throws -> T) rethrows -> T {
        if Thread.isMainThread { return try operation() }
        return try DispatchQueue.main.sync(execute: operation)
    }

    /// ScreenCaptureKit captures only the primary display and keeps pixels in memory until the response.
    private func screenshot(epoch: UInt64, display: PrimaryDisplay) throws -> [String: Any] {
        try ensureAllowed(epoch, input: false, topology: display.topology)
        guard CGPreflightScreenCaptureAccess() else { throw HelperError("Screen Recording permission is required.") }
        let context = currentContext()
        let completed = DispatchSemaphore(value: 0)
        let resultLock = NSLock()
        var captured: CGImage?
        var captureFailed = false
        SCShareableContent.getExcludingDesktopWindows(false, onScreenWindowsOnly: true) { content, error in
            guard error == nil, let content,
                  let screen = content.displays.first(where: { $0.displayID == display.id }) else {
                resultLock.lock(); captureFailed = true; resultLock.unlock()
                completed.signal()
                return
            }
            do { try self.ensureAllowed(epoch, input: false, topology: display.topology) }
            catch { resultLock.lock(); captureFailed = true; resultLock.unlock(); completed.signal(); return }
            let filter = SCContentFilter(display: screen, excludingApplications: [], exceptingWindows: [])
            let configuration = SCStreamConfiguration()
            configuration.width = display.width
            configuration.height = display.height
            configuration.showsCursor = true
            SCScreenshotManager.captureImage(contentFilter: filter, configuration: configuration) { image, error in
                resultLock.lock()
                captured = image
                captureFailed = error != nil || image == nil
                resultLock.unlock()
                completed.signal()
            }
        }
        guard completed.wait(timeout: .now() + 15) == .success else {
            throw HelperError("The native screenshot timed out.")
        }
        try ensureAllowed(epoch, input: false, topology: display.topology)
        resultLock.lock()
        let image = captured
        let failed = captureFailed
        resultLock.unlock()
        guard !failed, let image,
              let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
            throw HelperError("Unable to capture the primary display. Check Screen Recording permission.")
        }
        try ensureAllowed(epoch, input: false, topology: display.topology)
        return ["data": png.base64EncodedString(), "mimeType": "image/png", "width": image.width, "height": image.height,
                "topology": display.topology, "context": context]
    }

    /// Accessibility supplements screenshots without reading protected values or constructing a keystroke log.
    private func accessibilitySnapshot(epoch: UInt64) throws -> [String: Any] {
        try ensureAllowed(epoch, input: false)
        let identity: (pid_t, String) = try onMain {
            guard let application = NSWorkspace.shared.frontmostApplication else { throw HelperError("No foreground application is available.") }
            return (application.processIdentifier, application.localizedName ?? "")
        }
        // AX IPC can wait for another application. Keep it on this worker so input hooks and Stop stay responsive.
        let app = AXUIElementCreateApplication(identity.0)
        AXUIElementSetMessagingTimeout(app, 0.2)
        var windowValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(app, kAXFocusedWindowAttribute as CFString, &windowValue) == .success,
              let windowValue else {
            try ensureAllowed(epoch, input: false)
            return ["application": identity.1, "elements": []]
        }
        let window = unsafeBitCast(windowValue, to: AXUIElement.self)
        let deadline = ProcessInfo.processInfo.systemUptime + 2
        var remaining = 120
        func attribute(_ element: AXUIElement, _ name: String) throws -> CFTypeRef? {
            try ensureAllowed(epoch, input: false)
            guard ProcessInfo.processInfo.systemUptime < deadline else { return nil }
            AXUIElementSetMessagingTimeout(element, 0.2)
            var value: CFTypeRef?
            guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return nil }
            return value
        }
        func describe(_ element: AXUIElement, depth: Int) throws -> [String: Any] {
            try ensureAllowed(epoch, input: false)
            guard remaining > 0, ProcessInfo.processInfo.systemUptime < deadline else { return [:] }
            remaining -= 1
            let role = try attribute(element, kAXRoleAttribute) as? String ?? ""
            let subrole = try attribute(element, kAXSubroleAttribute) as? String ?? ""
            var result: [String: Any] = ["role": role, "subrole": subrole]
            // No AXValue/selected text is requested, including for ordinary editable fields.
            if subrole != "AXSecureTextField" {
                if let title = try attribute(element, kAXTitleAttribute) as? String { result["title"] = String(title.prefix(240)) }
                if let description = try attribute(element, kAXDescriptionAttribute) as? String { result["description"] = String(description.prefix(240)) }
            } else { result["protected"] = true }
            if let enabled = try attribute(element, kAXEnabledAttribute) as? Bool { result["enabled"] = enabled }
            if depth < 4, remaining > 0, let children = try attribute(element, kAXChildrenAttribute) as? [AXUIElement] {
                result["children"] = try Array(children.prefix(min(remaining, 30))).map { try describe($0, depth: depth + 1) }
            }
            return result
        }
        let tree = try describe(window, depth: 0)
        try ensureAllowed(epoch, input: false)
        return ["application": identity.1, "pid": identity.0, "window": tree]
    }

    /// Execute one bounded protocol operation; all side effects revalidate safety immediately before posting.
    private func perform(_ op: String, _ command: [String: Any], _ epoch: UInt64) throws -> [String: Any] {
        let display = PrimaryDisplay.current()
        let inputOperations: Set<String> = ["move", "click", "button", "drag", "scroll", "key", "type", "clipboardWrite"]
        if inputOperations.contains(op) {
            try ensureAllowed(epoch, input: true, topology: display.topology)
            if let topology = command["topology"] as? String, topology != display.topology {
                throw HelperError("The primary display changed; take a fresh screenshot before input.")
            }
            if let context = command["context"] as? String, context != currentContext() {
                throw HelperError("The foreground application or window changed; take a fresh screenshot before input.")
            }
        }
        switch op {
        case "screenshot":
            return try screenshot(epoch: epoch, display: display)
        case "accessibility":
            return try accessibilitySnapshot(epoch: epoch)
        case "clipboardRead":
            try ensureAllowed(epoch, input: false)
            return try onMain {
                try ensureAllowed(epoch, input: false)
                return ["text": NSPasteboard.general.string(forType: .string) ?? ""]
            }
        case "clipboardWrite":
            guard let text = command["text"] as? String, text.utf8.count <= 1_000_000 else { throw HelperError("Clipboard text is missing or too large.") }
            try onMain {
                try safety.synchronized {
                    try ensureAllowed(epoch, input: true, topology: display.topology)
                    NSPasteboard.general.clearContents()
                    guard NSPasteboard.general.setString(text, forType: .string) else { throw HelperError("Unable to write the system clipboard.") }
                }
            }
            return ["written": true]
        case "move":
            try move(to: target(command, display: display), duration: duration(command), epoch: epoch, display: display)
            return ["moved": true]
        case "click":
            try ensureAllowed(epoch, input: true, topology: display.topology)
            if command["x"] != nil || command["y"] != nil {
                try move(to: target(command, display: display), duration: duration(command), epoch: epoch, display: display)
            }
            let count = command["count"] as? Int ?? 1
            guard count == 1 || count == 2 else { throw HelperError("Click count must be one or two.") }
            let code = try buttonCode(command["button"])
            for index in 1...count {
                try mouseButton(code, down: true, count: index, epoch: epoch, display: display)
                Thread.sleep(forTimeInterval: 0.025)
                try mouseButton(code, down: false, count: index, epoch: epoch, display: display)
                if index < count { Thread.sleep(forTimeInterval: 0.045) }
            }
            return ["clicked": true]
        case "button":
            guard let down = command["isDown"] as? Bool else { throw HelperError("Button state is required.") }
            try mouseButton(buttonCode(command["button"]), down: down, epoch: epoch, display: display)
            return ["pressed": down]
        case "drag":
            let destination = try target(command, display: display)
            let code = try buttonCode(command["button"])
            try mouseButton(code, down: true, epoch: epoch, display: display)
            try move(to: destination, duration: duration(command), epoch: epoch, display: display)
            try mouseButton(code, down: false, epoch: epoch, display: display)
            return ["dragged": true]
        case "scroll":
            guard let pointer = CGEvent(source: nil)?.location, display.bounds.contains(pointer) else {
                throw HelperError("The current pointer is outside the supported primary display.")
            }
            let x = command["deltaX"] as? Double ?? 0
            let y = command["deltaY"] as? Double ?? 0
            guard x.isFinite, y.isFinite, abs(x) <= 100_000, abs(y) <= 100_000 else { throw HelperError("Scroll deltas are invalid.") }
            guard let event = CGEvent(scrollWheelEvent2Source: eventSource, units: .pixel, wheelCount: 2,
                                      wheel1: Int32(-y.rounded()), wheel2: Int32(-x.rounded()), wheel3: 0) else {
                throw HelperError("Unable to create a native scroll event.")
            }
            try post(event, epoch: epoch, topology: display.topology)
            return ["scrolled": true]
        case "key":
            guard let keys = command["keys"] as? [String] else { throw HelperError("Key chord is required.") }
            try pressKeys(keys, epoch: epoch, display: display)
            return ["pressed": true]
        case "type":
            guard let text = command["text"] as? String else { throw HelperError("Text is required.") }
            try typeText(text, epoch: epoch, display: display)
            return ["typed": true]
        default:
            throw HelperError("Unknown native desktop operation.")
        }
    }
}

let application = NSApplication.shared
let delegate = ComputerHelper()
application.setActivationPolicy(.accessory)
application.delegate = delegate
application.run()
