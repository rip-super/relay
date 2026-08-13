using System;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class BorderlessHelper {
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)] static extern IntPtr GetWindowLongPtr(IntPtr h, int i);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)] static extern IntPtr SetWindowLongPtr(IntPtr h, int i, IntPtr v);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll", EntryPoint = "GetMonitorInfoW")] static extern bool GetMonitorInfo(IntPtr h, ref MONITORINFO mi);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string cls, string win);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent, IntPtr child, string cls, string win);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SystemParametersInfo(uint action, uint param, string vparam, uint winini);

    delegate bool EnumWindowsProc(IntPtr h, IntPtr p);

    const int GWL_STYLE = -16;
    const long WS_CAPTION = 0x00C00000, WS_THICKFRAME = 0x00040000, WS_BORDER = 0x00800000, WS_DLGFRAME = 0x00400000;
    const uint MONITOR_DEFAULTTONEAREST = 2;
    const uint SWP_NOZORDER = 0x0004, SWP_NOACTIVATE = 0x0010, SWP_FRAMECHANGED = 0x0020, SWP_SHOWWINDOW = 0x0040;
    const int SW_HIDE = 0, SW_SHOW = 5, SW_RESTORE = 9;
    const uint SPI_GETDESKWALLPAPER = 0x0073, SPI_SETDESKWALLPAPER = 0x0014;
    const uint SPIF_UPDATEINIFILE = 0x01, SPIF_SENDCHANGE = 0x02;
    const int GAP = 1;

    [StructLayout(LayoutKind.Sequential)] struct RECT { public int left, top, right, bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MONITORINFO { public int cbSize; public RECT rcMonitor, rcWork; public uint dwFlags; }

    static string exeNeedle = "", titleNeedle = "";
    static IntPtr found = IntPtr.Zero;
    static string savedWallpaper = "";
    static object shellApp = null;

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
               r.right == mi.rcMonitor.right &&
               r.bottom == mi.rcMonitor.bottom - GAP;
    }

    static void MakeBorderless(IntPtr h) {
        if (IsIconic(h)) ShowWindow(h, SW_RESTORE);
        long style = (long)GetWindowLongPtr(h, GWL_STYLE);
        long stripped = style & ~(WS_CAPTION | WS_THICKFRAME | WS_BORDER | WS_DLGFRAME);
        if (stripped != style) SetWindowLongPtr(h, GWL_STYLE, (IntPtr)stripped);
        var mi = new MONITORINFO { cbSize = Marshal.SizeOf(typeof(MONITORINFO)) };
        if (!GetMonitorInfo(MonitorFromWindow(h, MONITOR_DEFAULTTONEAREST), ref mi)) return;
        SetWindowPos(h, IntPtr.Zero, mi.rcMonitor.left, mi.rcMonitor.top,
            mi.rcMonitor.right - mi.rcMonitor.left,
            (mi.rcMonitor.bottom - mi.rcMonitor.top) - GAP,
            SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
    }

    static void SetTaskbar(bool show) {
        int cmd = show ? SW_SHOW : SW_HIDE;
        IntPtr tb = FindWindow("Shell_TrayWnd", null);
        if (tb != IntPtr.Zero) ShowWindow(tb, cmd);
        IntPtr sec = IntPtr.Zero;
        while ((sec = FindWindowEx(IntPtr.Zero, sec, "Shell_SecondaryTrayWnd", null)) != IntPtr.Zero)
            ShowWindow(sec, cmd);
    }

    static void SetBlackWallpaper() {
        var sb = new StringBuilder(600);
        if (SystemParametersInfo(SPI_GETDESKWALLPAPER, (uint)sb.Capacity, sb, 0))
            savedWallpaper = sb.ToString();
        try {
            string path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "relay_black.bmp");
            using (var bmp = new System.Drawing.Bitmap(16, 16))
            using (var g = System.Drawing.Graphics.FromImage(bmp)) {
                g.Clear(System.Drawing.Color.Black);
                bmp.Save(path, System.Drawing.Imaging.ImageFormat.Bmp);
            }
            SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, path, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE);
        } catch { }
    }

    static void RestoreWallpaper() {
        if (savedWallpaper != "")
            SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, savedWallpaper, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE);
    }

    static object ShellApp() {
        if (shellApp == null) {
            Type t = Type.GetTypeFromProgID("Shell.Application");
            if (t != null) shellApp = Activator.CreateInstance(t);
        }
        return shellApp;
    }

    static void InvokeShell(string method) {
        try {
            object s = ShellApp();
            if (s != null) s.GetType().InvokeMember(method, BindingFlags.InvokeMethod, null, s, null);
        } catch { }
    }

    static void MinimizeAll() { InvokeShell("MinimizeAll"); }
    static void UndoMinimizeAll() { InvokeShell("UndoMinimizeALL"); }

    [STAThread]
    static void Main(string[] args) {
        if (args.Length >= 1) exeNeedle = args[0].Trim();
        if (args.Length >= 2) titleNeedle = args[1].Trim().ToLowerInvariant();

        bool taskbarHidden = false, wallpaperChanged = false, minimized = false;

        MinimizeAll();
        minimized = true;

        AppDomain.CurrentDomain.ProcessExit += (s, e) => {
            if (taskbarHidden) SetTaskbar(true);
            if (wallpaperChanged) RestoreWallpaper();
            if (minimized) UndoMinimizeAll();
        };

        try {
            int interval = 500;
            int waitedForWindow = 0, maxWait = 60000, missing = 0;
            bool appeared = false;

            while (true) {
                IntPtr h = FindGameWindow();
                if (h != IntPtr.Zero && IsWindow(h)) {
                    appeared = true; missing = 0;
                    if (!AlreadyBorderlessFullscreen(h)) MakeBorderless(h);
                    if (!taskbarHidden) {
                        SetTaskbar(false); taskbarHidden = true;
                        SetBlackWallpaper(); wallpaperChanged = true;
                        Console.WriteLine("APPLIED borderless + taskbar hidden + black wallpaper");
                    }
                } else if (!appeared) {
                    waitedForWindow += interval;
                    if (waitedForWindow >= maxWait) {
                        Console.WriteLine("NOWINDOW no normal window found - likely true exclusive (needs injection)");
                        break;
                    }
                } else if (++missing >= 4) {
                    Console.WriteLine("Game window closed, restoring.");
                    break;
                }
                Thread.Sleep(interval);
            }
        } finally {
            if (taskbarHidden) SetTaskbar(true);
            if (wallpaperChanged) RestoreWallpaper();
            if (minimized) UndoMinimizeAll();
        }
    }
}