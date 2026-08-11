import Cocoa

setbuf(stdout, nil)

let screenHeight = CGDisplayBounds(CGMainDisplayID()).height
let screenWidth = CGDisplayBounds(CGMainDisplayID()).width
let anchor = CGPoint(x: screenWidth / 2, y: screenHeight / 2)

while let line = readLine(strippingNewline: true) {
    let parts = line.split(separator: " ")
    guard parts.count == 2,
          let dx = Double(parts[0]),
          let dy = Double(parts[1]) else { continue }

    let move = CGEvent(mouseEventSource: nil,
                       mouseType: .mouseMoved,
                       mouseCursorPosition: anchor,
                       mouseButton: .left)
    move?.setIntegerValueField(.mouseEventDeltaX, value: Int64(dx))
    move?.setIntegerValueField(.mouseEventDeltaY, value: Int64(dy))
    move?.post(tap: .cghidEventTap)
}