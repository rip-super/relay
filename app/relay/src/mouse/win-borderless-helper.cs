using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class BorderlessHelper {
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)] static extern IntPtr GetWindowLongPtr(IntPtr h, int i);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)] static extern IntPtr SetWindowLongPtr(IntPtr h, int i, IntPtr v);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll", EntryPoint = "GetMonitorInfoW")] static extern bool GetMonitorInfo(IntPtr h, ref MONITORINFO mi);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);

    delegate bool EnumWindowsProc(IntPtr h, IntPtr p);

    const int GWL_STYLE = -16;
    const long WS_CAPTION = 0x00C00000, WS_THICKFRAME = 0x00040000, WS_BORDER = 0x00800000, WS_DLGFRAME = 0x00400000;
    const uint MONITOR_DEFAULTTONEAREST = 2;
    const uint SWP_NOZORDER = 0x0004, SWP_NOACTIVATE = 0x0010, SWP_FRAMECHANGED = 0x0020, SWP_SHOWWINDOW = 0x0040;

    [StructLayout(LayoutKind.Sequential)] struct RECT { public int left, top, right, bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MONITORINFO { public int cbSize; public RECT rcMonitor, rcWork; public uint dwFlags; }

    static string exeNeedle = "", titleNeedle = "";
    static IntPtr found = IntPtr.Zero;

    static bool MatchesProcess(IntPtr h) {
        if (exeNeedle == "") return false;
        uint pid; GetWindowThreadProcessId(h, out pid);
        try { return Process.GetProcessById((int)pid).ProcessName.Equals(exeNeedle, StringComparison.OrdinalIgnoreCase); }
        catch { return false; }
    }

    static bool MatchesTitle(IntPtr h) {
        if (titleNeedle == "") return false;
        int len = GetWindowTextLength(h);
        if (len == 0) return false;
        var sb = new StringBuilder(len + 1);
        GetWindowText(h, sb, sb.Capacity);
        return sb.ToString().ToLowerInvariant().Contains(titleNeedle);
    }

    static bool EnumProc(IntPtr h, IntPtr p) {
        if (!IsWindowVisible(h)) return true;
        RECT r; if (!GetWindowRect(h, out r)) return true;
        if (r.right - r.left < 200 || r.bottom - r.top < 200) return true;
        if (MatchesProcess(h) || MatchesTitle(h)) { found = h; return false; }
        return true;
    }

    static IntPtr FindGameWindow() { found = IntPtr.Zero; EnumWindows(EnumProc, IntPtr.Zero); return found; }

    static bool AlreadyBorderlessFullscreen(IntPtr h) {
        long style = (long)GetWindowLongPtr(h, GWL_STYLE);
        if ((style & (WS_CAPTION | WS_THICKFRAME)) != 0) return false;
        RECT r; if (!GetWindowRect(h, out r)) return false;
        var mi = new MONITORINFO { cbSize = Marshal.SizeOf(typeof(MONITORINFO)) };
        if (!GetMonitorInfo(MonitorFromWindow(h, MONITOR_DEFAULTTONEAREST), ref mi)) return false;
        return r.left == mi.rcMonitor.left && r.top == mi.rcMonitor.top &&
               r.right == mi.rcMonitor.right && r.bottom == mi.rcMonitor.bottom;
    }

    static void MakeBorderless(IntPtr h) {
        long style = (long)GetWindowLongPtr(h, GWL_STYLE);
        long stripped = style & ~(WS_CAPTION | WS_THICKFRAME | WS_BORDER | WS_DLGFRAME);
        if (stripped != style) SetWindowLongPtr(h, GWL_STYLE, (IntPtr)stripped);
        var mi = new MONITORINFO { cbSize = Marshal.SizeOf(typeof(MONITORINFO)) };
        if (!GetMonitorInfo(MonitorFromWindow(h, MONITOR_DEFAULTTONEAREST), ref mi)) return;
        SetWindowPos(h, IntPtr.Zero, mi.rcMonitor.left, mi.rcMonitor.top,
            mi.rcMonitor.right - mi.rcMonitor.left, mi.rcMonitor.bottom - mi.rcMonitor.top,
            SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
    }

    static void Main(string[] args) {
        if (args.Length >= 1) exeNeedle = args[0].Trim();
        if (args.Length >= 2) titleNeedle = args[1].Trim().ToLowerInvariant();

        int elapsed = 0, interval = 500, max = 60000;
        bool everFound = false;
        while (elapsed < max) {
            IntPtr h = FindGameWindow();
            if (h != IntPtr.Zero && IsWindow(h)) {
                if (!AlreadyBorderlessFullscreen(h)) {
                    MakeBorderless(h);
                    if (!everFound) { Console.WriteLine("APPLIED borderless to window"); everFound = true; }
                } else if (!everFound) {
                    Console.WriteLine("WINDOW already borderless-fullscreen"); everFound = true;
                }
            }
            Thread.Sleep(interval);
            elapsed += interval;
        }
        if (!everFound) Console.WriteLine("NOWINDOW no normal window found - likely true exclusive (needs injection)");
    }
}