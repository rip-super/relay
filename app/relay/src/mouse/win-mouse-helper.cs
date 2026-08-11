using System;
using System.Runtime.InteropServices;

namespace WinMouseHelper {
    class Program {
        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Explicit)]
        struct INPUT {
            [FieldOffset(0)]
            public uint type;

            [FieldOffset(8)]
            public MOUSEINPUT mi;
        }

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        static void Main(string[] args) {
            string line;
            int dx, dy;

            while ((line = Console.In.ReadLine()) != null) {
                var parts = line.Split(' ');
                if (parts.Length == 2 && int.TryParse(parts[0], out dx) && int.TryParse(parts[1], out dy)) {
                    INPUT[] inputs = new INPUT[1];
                    inputs[0].type = 0;
                    inputs[0].mi.dx = dx;
                    inputs[0].mi.dy = dy;
                    inputs[0].mi.mouseData = 0;
                    inputs[0].mi.dwFlags = 0x0001;
                    inputs[0].mi.dwExtraInfo = IntPtr.Zero;

                    SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
                }
            }
        }
    }
}