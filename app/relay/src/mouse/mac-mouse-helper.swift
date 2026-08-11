import Cocoa

setbuf(stdout, nil)
while let line = readLine(strippingNewline: true) {
    let parts = line.split(separator: " ")
    guard parts.count == 2,
          let dx = Double(parts[0]),
          let dy = Double(parts[1]) else { continue }

    let cur = CGEvent(source: nil)?.location ?? .zero
    let move = CGEvent(mouseEventSource: nil,
                       mouseType: .mouseMoved,
                       mouseCursorPosition: CGPoint(x: cur.x + dx, y: cur.y + dy),
                       mouseButton: .left)
    move?.setIntegerValueField(.mouseEventDeltaX, value: Int64(dx))
    move?.setIntegerValueField(.mouseEventDeltaY, value: Int64(dy))
    move?.post(tap: .cghidEventTap)
}