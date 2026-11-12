# Engine-owned native desktop helper. JSON lines are the only stdout output.
# Captures and clipboard values stay in memory and are returned only on request.
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$source = @'
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

/** One user-session helper; the engine coordinates ownership across projects. */
public static class PromptbookDesktop
{
    private const uint InputMouse = 0, InputKeyboard = 1;
    private const uint MoveFlag = 0x0001, AbsoluteFlag = 0x8000, VirtualDeskFlag = 0x4000;
    private const uint KeyUpFlag = 0x0002, UnicodeFlag = 0x0004;
    private static readonly UIntPtr OwnInput = new UIntPtr(0x5054424b);
    private static readonly BlockingCollection<ProtocolItem> Output = new BlockingCollection<ProtocolItem>();
    private static Thread OutputThread;
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 16777216 };
    private static readonly SemaphoreSlim Serial = new SemaphoreSlim(1, 1);
    private static readonly HashSet<ushort> HeldKeys = new HashSet<ushort>();
    private static readonly HashSet<string> HeldButtons = new HashSet<string>();
    private static Overlay Bar;
    private static CursorHalo Pointer;
    private static Label Caption;
    private static Button PauseButton;
    private static System.Windows.Forms.Timer HealthTimer;
    private static IntPtr MouseHook, KeyboardHook;
    private static HookProc MouseCallback = MouseEvent, KeyboardCallback = KeyboardEvent;
    private static volatile int Generation, ObservationGeneration;
    private static long LastHuman, LastHumanEvent;
    private static volatile bool HumanPaused, ManualPaused, Stopped, Closing, DesktopLost;
    private static Task<object> PendingAccessibility, PendingClipboard;
    private static volatile string IndicatorState = "idle";
    private static string Project = "Promptbook", Agent = "", Topology = "", ExpectedContext = "";

    /** FIFO protocol queue keeps JSON serialization and stdout backpressure away from native input hooks. */
    private sealed class ProtocolItem
    {
        public readonly object Value;
        public readonly ManualResetEventSlim Flushed;
        public ProtocolItem(object value, ManualResetEventSlim flushed) { Value = value; Flushed = flushed; }
    }

    /** Visible without activating or stealing the user's keyboard focus. */
    private sealed class Overlay : Form
    {
        protected override bool ShowWithoutActivation { get { return true; } }
        protected override CreateParams CreateParams
        {
            get { CreateParams p = base.CreateParams; p.ExStyle |= 0x08000000 | 0x00000080; return p; }
        }
    }

    /** A click-through visual marker for the agent; the actual Windows pointer remains shared. */
    private sealed class CursorHalo : Form
    {
        protected override bool ShowWithoutActivation { get { return true; } }
        protected override CreateParams CreateParams
        {
            get { CreateParams p = base.CreateParams; p.ExStyle |= 0x08000000 | 0x00000080 | 0x00000020 | 0x00080000; return p; }
        }
        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            using (Pen border = new Pen(Color.White, 5)) e.Graphics.DrawEllipse(border, 5, 5, 29, 29);
            using (Pen ring = new Pen(Color.FromArgb(130, 75, 255), 3)) e.Graphics.DrawEllipse(ring, 5, 5, 29, 29);
            using (SolidBrush label = new SolidBrush(Color.White)) e.Graphics.DrawString("AI", SystemFonts.SmallCaptionFont, label, 23, 25);
        }
    }

    [StructLayout(LayoutKind.Sequential)] private struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MouseHookData { public Point Point; public uint MouseData, Flags, Time; public UIntPtr ExtraInfo; }
    [StructLayout(LayoutKind.Sequential)] private struct KeyboardHookData { public uint VkCode, ScanCode, Flags, Time; public UIntPtr ExtraInfo; }
    [StructLayout(LayoutKind.Sequential)] private struct MouseInput { public int Dx, Dy; public uint MouseData, Flags, Time; public UIntPtr ExtraInfo; }
    [StructLayout(LayoutKind.Sequential)] private struct KeyboardInput { public ushort Vk, Scan; public uint Flags, Time; public UIntPtr ExtraInfo; }
    [StructLayout(LayoutKind.Explicit)] private struct InputUnion { [FieldOffset(0)] public MouseInput Mouse; [FieldOffset(0)] public KeyboardInput Keyboard; }
    [StructLayout(LayoutKind.Sequential)] private struct Input { public uint Type; public InputUnion Data; }
    private delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll", SetLastError = true)] private static extern uint SendInput(uint count, Input[] inputs, int size);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SetWindowsHookEx(int id, HookProc callback, IntPtr module, uint threadId);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string module);
    [DllImport("user32.dll")] private static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] private static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll")] private static extern bool SwitchDesktop(IntPtr desktop);
    [DllImport("user32.dll")] private static extern bool CloseDesktop(IntPtr desktop);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern bool GetUserObjectInformation(IntPtr obj, int index, StringBuilder info, uint length, out uint needed);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr window, StringBuilder text, int length);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect bounds);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern short VkKeyScan(char character);

    /** Start in the same interactive session as the engine, disarmed until selected. */
    public static void Run()
    {
        try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch (EntryPointNotFoundException) { SetProcessDPIAware(); }
        try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch (EntryPointNotFoundException) { }
        OutputThread = new Thread(WriteResponses) { IsBackground = true, Name = "ptbk-computer-stdout" };
        OutputThread.Start();
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Bar = new Overlay { Text = "Promptbook Computer Control", TopMost = true, ShowInTaskbar = false,
            FormBorderStyle = FormBorderStyle.FixedToolWindow, StartPosition = FormStartPosition.Manual,
            Width = 470, Height = 92, BackColor = Color.FromArgb(22, 33, 50), ForeColor = Color.White };
        Caption = new Label { Left = 10, Top = 9, Width = 265, Height = 48, AutoEllipsis = true, Text = "Promptbook - idle" };
        PauseButton = new Button { Left = 280, Top = 12, Width = 78, Height = 32, Text = "Pause" };
        Button stop = new Button { Left = 366, Top = 12, Width = 78, Height = 32, Text = "Stop", BackColor = Color.Firebrick, ForeColor = Color.White };
        PauseButton.Click += delegate { if (ManualPaused && !Stopped) { try { Resume(true); } catch { Stop(true); } } else Pause(true); };
        stop.Click += delegate { Stop(true); };
        Bar.Controls.Add(Caption); Bar.Controls.Add(PauseButton); Bar.Controls.Add(stop);
        PositionBar();
        Pointer = new CursorHalo { FormBorderStyle = FormBorderStyle.None, ShowInTaskbar = false, TopMost = true,
            StartPosition = FormStartPosition.Manual, Width = 44, Height = 44, BackColor = Color.Lime, TransparencyKey = Color.Lime };
        Bar.FormClosing += delegate { Closing = true; ObservationGeneration++; CancelInputs(); Application.ExitThread(); };
        // Create a message target without showing a window; capability probes stay unobtrusive.
        if (Bar.Handle == IntPtr.Zero) throw new InvalidOperationException("Unable to create desktop helper message target.");
        try
        {
            IntPtr module = GetModuleHandle(null);
            MouseHook = SetWindowsHookEx(14, MouseCallback, module, 0);
            KeyboardHook = SetWindowsHookEx(13, KeyboardCallback, module, 0);
            if (MouseHook == IntPtr.Zero || KeyboardHook == IntPtr.Zero) throw new InvalidOperationException("Physical input monitoring is unavailable.");
        }
        catch { Stopped = true; Emit("unavailable", "Physical input monitoring is unavailable."); }
        Topology = CurrentTopology();
        HealthTimer = new System.Windows.Forms.Timer { Interval = 100 };
        HealthTimer.Tick += delegate { CheckHealth(); };
        HealthTimer.Start();
        Thread reader = new Thread(ReadCommands) { IsBackground = true, Name = "ptbk-computer-stdin" };
        reader.Start();
        try { Application.Run(); }
        finally
        {
            Closing = true;
            ObservationGeneration++;
            CancelInputs();
            if (HealthTimer != null) HealthTimer.Dispose();
            if (Pointer != null) Pointer.Dispose();
            if (MouseHook != IntPtr.Zero) UnhookWindowsHookEx(MouseHook);
            if (KeyboardHook != IntPtr.Zero) UnhookWindowsHookEx(KeyboardHook);
            Output.CompleteAdding();
            if (OutputThread != null) OutputThread.Join(1000);
        }
    }

    /** Read complete requests off the GUI thread, then marshal to its STA context. */
    private static void ReadCommands()
    {
        try
        {
            string line;
            while (!Closing && (line = Console.ReadLine()) != null)
            {
                if (line.Length == 0) continue;
                Dictionary<string, object> request;
                try { request = new JavaScriptSerializer { MaxJsonLength = 16777216 }.Deserialize<Dictionary<string, object>>(line); }
                catch { Write(new { id = (object)null, error = "Invalid helper JSON request." }); continue; }
                if (request == null) continue;
                Dictionary<string, object> current = request;
                Bar.BeginInvoke((Action)(async delegate { await Handle(current); }));
            }
        }
        catch { }
        finally
        {
            if (!Closing && Bar != null && !Bar.IsDisposed)
            {
                try { Bar.BeginInvoke((Action)delegate { Closing = true; ObservationGeneration++; CancelInputs(); Bar.Close(); }); } catch { }
            }
        }
    }

    /** Priority stop/release requests can interrupt a smooth move already in progress. */
    private static async Task Handle(Dictionary<string, object> request)
    {
        object id = Value(request, "id");
        string op = Text(request, "op", "");
        bool locked = false;
        bool observation = op == "screenshot" || op == "accessibility" || op == "clipboardRead";
        int receivedGeneration = observation ? ObservationGeneration : Generation;
        try
        {
            object result;
            switch (op)
            {
                case "status": case "permissions": result = Status(); break;
                case "indicator":
                    Project = Short(Text(request, "project", "Promptbook"), 70);
                    Agent = Short(Text(request, "agent", ""), 70);
                    string next = Text(request, "state", "idle");
                    if (next != "active" && next != IndicatorState) CancelInputs();
                    if (next != "active" && next != "human-paused" && next != IndicatorState) ObservationGeneration++;
                    IndicatorState = next;
                    if (next == "idle" || next == "disabled") Bar.Hide(); else if (!Bar.Visible) Bar.Show();
                    UpdateCaption();
                    result = new { visible = Bar.Visible, state = IndicatorState };
                    break;
                case "releaseInputs": CancelInputs(); result = new { released = true }; break;
                case "resume": Resume(); result = Status(); break;
                case "pause": Pause(); result = Status(); break;
                case "stop": Stop(); result = Status(); break;
                case "close":
                    Closing = true; ObservationGeneration++; CancelInputs(); WriteFlushed(new { id = id, result = new { closed = true } }); Bar.Close(); return;
                default:
                    await Serial.WaitAsync(); locked = true;
                    ExpectedContext = Text(request, "context", "");
                    RequireAllowed(receivedGeneration, observation);
                    result = await Execute(op, request, receivedGeneration);
                    break;
            }
            Write(new { id = id, result = result });
        }
        catch (Exception error)
        {
            // Never include command parameters, clipboard or typed content in diagnostics.
            CancelInputs();
            Write(new { id = id, error = error is InvalidOperationException || error is ArgumentException ? error.Message : "Native desktop operation failed." });
        }
        finally { if (locked) { ExpectedContext = ""; Serial.Release(); } }
    }

    /** Implement primitives without routing through a shell or application-specific automation. */
    private static async Task<object> Execute(string op, Dictionary<string, object> r, int generation)
    {
        switch (op)
        {
            case "screenshot":
                Rectangle screen = Screen.PrimaryScreen.Bounds;
                string screenshotContext = CurrentContext(), screenshotTopology = CurrentTopology();
                object screenshot = await Task.Run((Func<object>)delegate
                {
                    try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch (EntryPointNotFoundException) { }
                    using (Bitmap image = new Bitmap(screen.Width, screen.Height, PixelFormat.Format32bppArgb))
                    {
                        using (Graphics graphics = Graphics.FromImage(image)) graphics.CopyFromScreen(screen.Left, screen.Top, 0, 0, image.Size, CopyPixelOperation.SourceCopy);
                        using (MemoryStream bytes = new MemoryStream())
                        {
                            image.Save(bytes, ImageFormat.Png);
                            return new { data = Convert.ToBase64String(bytes.ToArray()), mimeType = "image/png", width = screen.Width, height = screen.Height, topology = screenshotTopology, context = screenshotContext };
                        }
                    }
                });
                RequireAllowed(generation, true);
                return screenshot;
            case "move": await Move(r, generation, null); return new { moved = true };
            case "drag":
                string dragButton = ButtonName(r);
                MouseButton(dragButton, true);
                try { await Move(r, generation, dragButton); }
                finally { if (HeldButtons.Contains(dragButton)) MouseButton(dragButton, false); }
                return new { dragged = true };
            case "click":
                if (r.ContainsKey("x") || r.ContainsKey("y")) await Move(r, generation, null);
                string button = ButtonName(r); int count = Integer(r, "count", 1, 1, 2);
                for (int i = 0; i < count; i++)
                {
                    RequireAllowed(generation, false); MouseButton(button, true);
                    try { await Task.Delay(35); RequireAllowed(generation, false, false); }
                    finally { if (HeldButtons.Contains(button)) MouseButton(button, false); }
                    ExpectedContext = CurrentContext();
                    if (i + 1 < count) await Task.Delay(70);
                }
                return new { clicked = true, count = count };
            case "button": MouseButton(ButtonName(r), Bool(r, "isDown")); return new { changed = true };
            case "scroll":
                // Positive Y scrolls down; values use the native Windows wheel delta (120 per detent).
                int vertical = Integer(r, "deltaY", 0, -12000, 12000), horizontal = Integer(r, "deltaX", 0, -12000, 12000);
                if (vertical != 0) SendMouse(0, 0, unchecked((uint)(-vertical)), 0x0800);
                if (horizontal != 0) SendMouse(0, 0, unchecked((uint)horizontal), 0x1000);
                return new { scrolled = true };
            case "key":
                object value = Value(r, "keys"); object[] keys = value as object[];
                if (keys == null)
                {
                    System.Collections.ArrayList list = value as System.Collections.ArrayList;
                    if (list != null) keys = list.ToArray();
                }
                if (keys == null || keys.Length < 1 || keys.Length > 12) throw new ArgumentException("keys must contain 1 to 12 key names.");
                List<ushort> pressed = new List<ushort>();
                try
                {
                    foreach (object item in keys)
                    {
                        RequireAllowed(generation, false);
                        ushort code = KeyCode(Convert.ToString(item));
                        SendKey(code, true); pressed.Add(code);
                    }
                    await Task.Delay(30); RequireAllowed(generation, false, false);
                }
                finally { for (int i = pressed.Count - 1; i >= 0; i--) if (HeldKeys.Contains(pressed[i])) SendKey(pressed[i], false); }
                return new { pressed = true };
            case "type":
                string text = Text(r, "text", "");
                if (text.Length > 100000) throw new ArgumentException("Typed input exceeds the operation limit.");
                foreach (char character in text)
                {
                    RequireAllowed(generation, false);
                    SendUnicode(character, false); SendUnicode(character, true);
                    await Task.Delay(2);
                }
                return new { typed = true, length = text.Length };
            case "clipboardRead": return await ClipboardOperation(false, null, generation);
            case "clipboardWrite":
                string content = Text(r, "text", "");
                if (content.Length > 1000000) throw new ArgumentException("Clipboard text exceeds the operation limit.");
                return await ClipboardOperation(true, content, generation);
            case "accessibility":
                IntPtr foreground = GetForegroundWindow(); StringBuilder title = new StringBuilder(1024);
                GetWindowText(foreground, title, title.Capacity); uint process; GetWindowThreadProcessId(foreground, out process);
                Rect rect; GetWindowRect(foreground, out rect); string app = "";
                try { app = Process.GetProcessById((int)process).ProcessName; } catch { }
                if (PendingAccessibility != null && !PendingAccessibility.IsCompleted) throw new InvalidOperationException("The previous accessibility query is still awaiting its target application.");
                Task<object> treeTask = Task.Run((Func<object>)(delegate { return AccessibilityTree(foreground, generation); }));
                PendingAccessibility = treeTask;
                object tree = null;
                if (await Task.WhenAny(treeTask, Task.Delay(2000)) == treeTask)
                {
                    try { tree = await treeTask; } catch { }
                }
                RequireAllowed(generation, true);
                return new { application = app, title = title.ToString(), bounds = new { x = rect.Left, y = rect.Top, width = rect.Right - rect.Left, height = rect.Bottom - rect.Top }, tree = tree, scope = tree == null ? "foreground-window-metadata" : "foreground-accessibility-tree" };
            default: throw new ArgumentException("Unknown native desktop operation.");
        }
    }

    /** Keep unresponsive clipboard owners off the GUI thread, with one pending native call at most. */
    private static async Task<object> ClipboardOperation(bool write, string content, int generation)
    {
        if (PendingClipboard != null && !PendingClipboard.IsCompleted)
            throw new InvalidOperationException("The previous clipboard operation is still awaiting its owner; no additional clipboard operation was started.");
        TaskCompletionSource<object> completion = new TaskCompletionSource<object>(TaskCreationOptions.RunContinuationsAsynchronously);
        Task<object> pending = completion.Task;
        PendingClipboard = pending;
        Thread worker = new Thread(delegate()
        {
            try
            {
                // The worker may not start until after the engine/user revoked its original command.
                if (generation != (write ? Generation : ObservationGeneration) || Closing || Stopped || ManualPaused ||
                    (IndicatorState != "active" && (write || IndicatorState != "human-paused")) ||
                    (write && (HumanPaused || Now() - Interlocked.Read(ref LastHuman) < 5000)))
                    throw new InvalidOperationException("Clipboard operation interrupted before it started.");
                object result;
                if (write)
                {
                    if (content.Length == 0) Clipboard.Clear();
                    else Clipboard.SetDataObject(content, true, 0, 0);
                    result = new { written = true };
                }
                else result = new { text = Clipboard.ContainsText() ? Clipboard.GetText() : "" };
                completion.TrySetResult(result);
            }
            catch
            {
                // A native clipboard call cannot be safely aborted mid-call; do not expose its exception text.
                completion.TrySetException(new InvalidOperationException(write ?
                    "Native clipboard write failed; verify clipboard state before retrying." : "Native clipboard read failed."));
            }
        }) { IsBackground = true, Name = "ptbk-computer-clipboard" };
        worker.SetApartmentState(ApartmentState.STA);
        worker.Start();
        if (await Task.WhenAny(pending, Task.Delay(5000)) != pending)
            throw new InvalidOperationException(write ?
                "Native clipboard write timed out; its outcome is uncertain. Verify clipboard state before retrying." :
                "Native clipboard read timed out; another clipboard operation cannot start until it finishes.");
        object response = await pending;
        RequireAllowed(generation, !write);
        return response;
    }

    /** Read a bounded UI Automation control tree without ever asking for password/value patterns. */
    private static object AccessibilityTree(IntPtr window, int generation)
    {
        Type elementType = Type.GetType("System.Windows.Automation.AutomationElement, UIAutomationClient, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35", false);
        Type walkerType = Type.GetType("System.Windows.Automation.TreeWalker, UIAutomationClient, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35", false);
        if (elementType == null || walkerType == null) return null;
        object element = elementType.GetMethod("FromHandle").Invoke(null, new object[] { window });
        object walker = walkerType.GetField("ControlViewWalker").GetValue(null);
        int remaining = 200;
        return AccessibilityNode(element, elementType, walker, walkerType, 0, generation, Now() + 1800, ref remaining);
    }

    /** Every traversed node checks cancellation; UIA calls stay off the input-monitoring GUI thread. */
    private static object AccessibilityNode(object element, Type elementType, object walker, Type walkerType, int depth, int generation, long deadline, ref int remaining)
    {
        if (element == null || remaining-- <= 0 || depth > 6 || generation != ObservationGeneration || Now() >= deadline) return null;
        object current = elementType.GetProperty("Current").GetValue(element, null);
        Type info = current.GetType();
        bool password = (bool)info.GetProperty("IsPassword").GetValue(current, null);
        object control = info.GetProperty("ControlType").GetValue(current, null);
        string role = (string)control.GetType().GetProperty("ProgrammaticName").GetValue(control, null);
        string name = password ? "" : (string)info.GetProperty("Name").GetValue(current, null);
        List<object> children = new List<object>();
        if (!password && depth < 6 && remaining > 0)
        {
            object child = walkerType.GetMethod("GetFirstChild", new Type[] { elementType }).Invoke(walker, new object[] { element });
            while (child != null && remaining > 0 && generation == ObservationGeneration && Now() < deadline)
            {
                object node = AccessibilityNode(child, elementType, walker, walkerType, depth + 1, generation, deadline, ref remaining);
                if (node != null) children.Add(node);
                child = walkerType.GetMethod("GetNextSibling", new Type[] { elementType }).Invoke(walker, new object[] { child });
            }
        }
        return new { role = role, name = Short(name ?? "", 512), password = password,
            enabled = (bool)info.GetProperty("IsEnabled").GetValue(current, null),
            offscreen = (bool)info.GetProperty("IsOffscreen").GetValue(current, null), children = children };
    }

    /** Move along a real interruptible path; coordinates are primary-screen physical pixels. */
    private static async Task Move(Dictionary<string, object> r, int generation, string dragging)
    {
        Rectangle screen = Screen.PrimaryScreen.Bounds;
        int x = Integer(r, "x", -1, 0, screen.Width - 1), y = Integer(r, "y", -1, 0, screen.Height - 1);
        int duration = Integer(r, "durationMs", 300, 50, 5000);
        Point start; if (!GetCursorPos(out start)) throw new InvalidOperationException("Unable to read the shared system pointer.");
        int targetX = screen.Left + x, targetY = screen.Top + y;
        Stopwatch elapsed = Stopwatch.StartNew();
        do
        {
            RequireAllowed(generation, false);
            double progress = Math.Min(1, elapsed.Elapsed.TotalMilliseconds / duration);
            double eased = progress * progress * (3 - 2 * progress);
            int px = (int)Math.Round(start.X + (targetX - start.X) * eased), py = (int)Math.Round(start.Y + (targetY - start.Y) * eased);
            Rectangle desktop = SystemInformation.VirtualScreen;
            int absoluteX = desktop.Width <= 1 ? 0 : (int)Math.Round((px - desktop.Left) * 65535.0 / (desktop.Width - 1));
            int absoluteY = desktop.Height <= 1 ? 0 : (int)Math.Round((py - desktop.Top) * 65535.0 / (desktop.Height - 1));
            SendMouse(absoluteX, absoluteY, 0, MoveFlag | AbsoluteFlag | VirtualDeskFlag);
            UpdatePointer();
            if (progress >= 1) break;
            await Task.Delay(8);
        } while (true);
    }

    /** Refuse stale commands, secure desktops and invisible/disarmed indicators. */
    private static void RequireAllowed(int generation, bool observation, bool validateContext = true)
    {
        if (!observation && validateContext && ExpectedContext.Length > 0 && ExpectedContext != CurrentContext()) throw new InvalidOperationException("The foreground window changed; acquire a fresh screen before continuing.");
        if (generation != (observation ? ObservationGeneration : Generation)) throw new InvalidOperationException("Desktop operation interrupted; acquire a fresh screen before continuing.");
        if (Closing || Stopped || ManualPaused) throw new InvalidOperationException("Computer Control is paused or stopped.");
        if (Bar == null || !Bar.Visible || Bar.IsDisposed || MouseHook == IntPtr.Zero || KeyboardHook == IntPtr.Zero) throw new InvalidOperationException("Visible desktop indicator and input monitoring are required.");
        if (IndicatorState != "active" && !(observation && IndicatorState == "human-paused")) throw new InvalidOperationException("Computer Control has not been armed by the engine.");
        if (!InteractiveDesktop()) { CancelInputs(); throw new InvalidOperationException("The interactive desktop is locked or unavailable."); }
        if (!observation && (HumanPaused || Now() - LastHuman < 5000)) throw new InvalidOperationException("Human input has priority; wait for five seconds of inactivity.");
        if (Topology != CurrentTopology()) { CancelInputs(); throw new InvalidOperationException("The primary display changed; acquire a fresh screen before continuing."); }
    }

    /** True only on the logged-in visible Default desktop, excluding lock/UAC/screensaver desktops. */
    private static bool InteractiveDesktop()
    {
        if (!Environment.UserInteractive || Process.GetCurrentProcess().SessionId == 0) return false;
        IntPtr desktop = OpenInputDesktop(0, false, 0x0001 | 0x0100);
        if (desktop == IntPtr.Zero) return false;
        try
        {
            StringBuilder name = new StringBuilder(256); uint needed;
            return GetUserObjectInformation(desktop, 2, name, 512, out needed) && name.ToString() == "Default" && SwitchDesktop(desktop);
        }
        finally { CloseDesktop(desktop); }
    }

    /** Report capability and permission separately from engine/local pause state. */
    private static object Status()
    {
        Rectangle screen = Screen.PrimaryScreen.Bounds;
        bool interactive = InteractiveDesktop(), monitored = MouseHook != IntPtr.Zero && KeyboardHook != IntPtr.Zero;
        return new { supported = true, available = interactive && monitored && !Stopped,
            reason = !interactive ? "An unlocked interactive Windows user desktop is required." : !monitored ? "Physical input monitoring is unavailable." : Stopped ? "Computer Control was stopped locally." : "",
            accessibility = interactive, screenRecording = interactive, cursor = "shared",
            primaryScreen = new { width = screen.Width, height = screen.Height, scaleFactor = 1, topology = CurrentTopology() },
            lastHumanInputAt = LastHuman, isPaused = ManualPaused, isStopped = Stopped, context = CurrentContext() };
    }

    /** Local controls are authoritative even if a stale engine sends an active indicator. */
    private static void Pause(bool emit = false) { ManualPaused = true; ObservationGeneration++; CancelInputs(); UpdateCaption(); if (emit) Emit("pause", null); }
    private static void Stop(bool emit = false) { Stopped = true; ManualPaused = true; ObservationGeneration++; CancelInputs(); UpdateCaption(); if (emit) Emit("stop", null); }
    private static void Resume(bool emit = false)
    {
        if (!InteractiveDesktop()) throw new InvalidOperationException("The interactive desktop is unavailable.");
        ManualPaused = false; Stopped = false; HumanPaused = Now() - LastHuman < 5000;
        ObservationGeneration++; CancelInputs(); IndicatorState = "idle"; Bar.Hide(); UpdateCaption(); if (emit) Emit("resume", null);
    }

    /** Cancel a running generation and release only keys/buttons this helper pressed. */
    private static void CancelInputs()
    {
        Generation++;
        foreach (ushort key in new List<ushort>(HeldKeys)) { try { SendKey(key, false); } catch { } }
        foreach (string button in new List<string>(HeldButtons)) { try { MouseButton(button, false); } catch { } }
        HeldKeys.Clear(); HeldButtons.Clear();
    }

    /** Detect real input without recording key names, characters or pointer coordinates. */
    private static void HumanInput()
    {
        long now = Now(); Interlocked.Exchange(ref LastHuman, now); HumanPaused = true; if (Pointer != null) Pointer.Hide(); CancelInputs(); UpdateCaption();
        if (now - LastHumanEvent >= 100) { LastHumanEvent = now; Emit("human-input", null); }
    }
    private static IntPtr MouseEvent(int code, IntPtr message, IntPtr data)
    {
        if (!Closing && code >= 0 && ((MouseHookData)Marshal.PtrToStructure(data, typeof(MouseHookData))).ExtraInfo != OwnInput) HumanInput();
        return CallNextHookEx(MouseHook, code, message, data);
    }
    private static IntPtr KeyboardEvent(int code, IntPtr message, IntPtr data)
    {
        if (!Closing && code >= 0 && ((KeyboardHookData)Marshal.PtrToStructure(data, typeof(KeyboardHookData))).ExtraInfo != OwnInput) HumanInput();
        return CallNextHookEx(KeyboardHook, code, message, data);
    }

    /** Poll desktop transitions and idle resume while the message loop remains responsive. */
    private static void CheckHealth()
    {
        bool interactive = InteractiveDesktop();
        if (!interactive && !DesktopLost)
        {
            DesktopLost = true; IndicatorState = "idle"; ObservationGeneration++; CancelInputs(); UpdateCaption(); Emit("unavailable", "The interactive desktop became unavailable.");
        }
        if (interactive && DesktopLost) { DesktopLost = false; Emit("unavailable", "Desktop restored; reacquire the current screen before continuing."); }
        string topology = CurrentTopology();
        if (Topology != topology)
        {
            Topology = topology; IndicatorState = "idle"; ObservationGeneration++; CancelInputs(); PositionBar(); Emit("unavailable", "Primary display changed; reacquire the current screen.");
        }
        if (HumanPaused && Now() - LastHuman >= 5000)
        {
            HumanPaused = false; UpdateCaption();
        }
        UpdatePointer();
    }

    /** Native SendInput packets carry a marker so they cannot trigger the human pause. */
    private static void SendMouse(int x, int y, uint data, uint flags)
    {
        Input packet = new Input { Type = InputMouse, Data = new InputUnion { Mouse = new MouseInput { Dx = x, Dy = y, MouseData = data, Flags = flags, ExtraInfo = OwnInput } } };
        if (SendInput(1, new Input[] { packet }, Marshal.SizeOf(typeof(Input))) != 1) throw new InvalidOperationException("Windows rejected desktop input; check the target's privilege level.");
    }
    private static void MouseButton(string name, bool down)
    {
        uint flags = name == "right" ? (down ? 0x0008u : 0x0010u) : name == "middle" ? (down ? 0x0020u : 0x0040u) : (down ? 0x0002u : 0x0004u);
        SendMouse(0, 0, 0, flags);
        if (down) HeldButtons.Add(name); else HeldButtons.Remove(name);
    }
    private static void SendKey(ushort key, bool down)
    {
        Input packet = new Input { Type = InputKeyboard, Data = new InputUnion { Keyboard = new KeyboardInput { Vk = key, Flags = down ? 0u : KeyUpFlag, ExtraInfo = OwnInput } } };
        if (SendInput(1, new Input[] { packet }, Marshal.SizeOf(typeof(Input))) != 1) throw new InvalidOperationException("Windows rejected keyboard input; check the target's privilege level.");
        if (down) HeldKeys.Add(key); else HeldKeys.Remove(key);
    }
    private static void SendUnicode(char character, bool up)
    {
        Input packet = new Input { Type = InputKeyboard, Data = new InputUnion { Keyboard = new KeyboardInput { Scan = character, Flags = UnicodeFlag | (up ? KeyUpFlag : 0u), ExtraInfo = OwnInput } } };
        if (SendInput(1, new Input[] { packet }, Marshal.SizeOf(typeof(Input))) != 1) throw new InvalidOperationException("Windows rejected text input; check the target's privilege level.");
    }

    /** Translate common MCP key names, failing explicitly for unsupported combinations. */
    private static ushort KeyCode(string name)
    {
        if (name == null) throw new ArgumentException("Invalid key name.");
        string key = name.ToUpperInvariant().Replace("_L", "").Replace("_R", "").Replace("_", "").Replace("-", "");
        switch (key)
        {
            case "CTRL": case "CONTROL": return 0x11;
            case "ALT": case "OPTION": return 0x12;
            case "SHIFT": return 0x10;
            case "META": case "SUPER": case "WIN": case "WINDOWS": case "COMMAND": case "CMD": return 0x5b;
            case "ENTER": case "RETURN": return 0x0d;
            case "TAB": return 0x09;
            case "ESC": case "ESCAPE": return 0x1b;
            case "SPACE": return 0x20;
            case "BACKSPACE": return 0x08;
            case "DELETE": case "DEL": return 0x2e;
            case "INSERT": return 0x2d;
            case "HOME": return 0x24;
            case "END": return 0x23;
            case "PAGEUP": return 0x21;
            case "PAGEDOWN": return 0x22;
            case "LEFT": case "ARROWLEFT": return 0x25;
            case "UP": case "ARROWUP": return 0x26;
            case "RIGHT": case "ARROWRIGHT": return 0x27;
            case "DOWN": case "ARROWDOWN": return 0x28;
            case "CAPSLOCK": return 0x14;
        }
        int function;
        if (key.StartsWith("F") && Int32.TryParse(key.Substring(1), out function) && function >= 1 && function <= 24) return (ushort)(0x70 + function - 1);
        if (name.Length == 1)
        {
            short mapped = VkKeyScan(name[0]);
            if (mapped != -1 && (mapped & 0xff00) == 0) return (ushort)(mapped & 0xff);
            if (key[0] >= 'A' && key[0] <= 'Z') return key[0];
            if (key[0] >= '0' && key[0] <= '9') return key[0];
        }
        throw new ArgumentException("Unsupported key name; use text input for arbitrary characters.");
    }

    /** Keep status text bounded; it never contains typed text or clipboard contents. */
    private static void UpdateCaption()
    {
        if (Caption == null) return;
        string state = Stopped ? "STOPPED" : ManualPaused ? "PAUSED" : HumanPaused ? "Human has control" : DesktopLost ? "Desktop unavailable" : IndicatorState;
        Caption.Text = Project + (Agent.Length > 0 ? " / " + Agent : "") + "\n" + state;
        PauseButton.Text = ManualPaused && !Stopped ? "Resume" : "Pause";
        UpdatePointer();
    }
    /** Mark synthetic pointer use without intercepting clicks or taking application focus. */
    private static void UpdatePointer()
    {
        if (Pointer == null || Pointer.IsDisposed) return;
        if (Closing || Stopped || ManualPaused || HumanPaused || DesktopLost || IndicatorState != "active" || Bar == null || !Bar.Visible)
        {
            Pointer.Hide(); return;
        }
        Point point;
        if (!GetCursorPos(out point)) { Pointer.Hide(); return; }
        Pointer.Location = new System.Drawing.Point(point.X - 20, point.Y - 20);
        if (!Pointer.Visible) Pointer.Show();
    }
    private static void PositionBar()
    {
        Rectangle work = Screen.PrimaryScreen.WorkingArea;
        Bar.Location = new System.Drawing.Point(Math.Max(work.Left, work.Right - Bar.Width - 12), work.Top + 12);
    }
    private static string CurrentContext() { return GetForegroundWindow().ToInt64().ToString("x", System.Globalization.CultureInfo.InvariantCulture); }
    private static string CurrentTopology()
    {
        Screen screen = Screen.PrimaryScreen; Rectangle b = screen.Bounds;
        return screen.DeviceName + ":" + b.Left + "," + b.Top + ":" + b.Width + "x" + b.Height;
    }
    private static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
    private static string Short(string value, int limit) { return value.Length <= limit ? value : value.Substring(0, limit); }
    private static object Value(Dictionary<string, object> r, string key) { object value; return r.TryGetValue(key, out value) ? value : null; }
    private static string Text(Dictionary<string, object> r, string key, string fallback) { object value = Value(r, key); return value is string ? (string)value : fallback; }
    private static bool Bool(Dictionary<string, object> r, string key) { object value = Value(r, key); return value is bool && (bool)value; }
    private static int Integer(Dictionary<string, object> r, string key, int fallback, int min, int max)
    {
        object raw = Value(r, key); double value = raw == null ? fallback : Convert.ToDouble(raw, System.Globalization.CultureInfo.InvariantCulture);
        if (Double.IsNaN(value) || Double.IsInfinity(value) || value < min || value > max) throw new ArgumentException("Desktop coordinates or operation values are out of range.");
        return (int)Math.Round(value);
    }
    private static string ButtonName(Dictionary<string, object> r)
    {
        string button = Text(r, "button", "left").ToLowerInvariant();
        if (button != "left" && button != "middle" && button != "right") throw new ArgumentException("Unsupported mouse button.");
        return button;
    }
    private static void Emit(string name, string reason) { Write(new { @event = name, reason = reason, lastHumanInputAt = LastHuman }); }
    private static void Write(object value)
    {
        if (!Output.IsAddingCompleted) Output.Add(new ProtocolItem(value, null));
    }
    private static void WriteFlushed(object value)
    {
        using (ManualResetEventSlim flushed = new ManualResetEventSlim(false))
        {
            Output.Add(new ProtocolItem(value, flushed));
            flushed.Wait(2000);
        }
    }
    private static void WriteResponses()
    {
        try
        {
            foreach (ProtocolItem item in Output.GetConsumingEnumerable())
            {
                try { Console.Out.WriteLine(Json.Serialize(item.Value)); Console.Out.Flush(); }
                finally { if (item.Flushed != null) { try { item.Flushed.Set(); } catch (ObjectDisposedException) { } } }
            }
        }
        catch
        {
            if (!Closing && Bar != null && !Bar.IsDisposed)
            {
                try { Bar.BeginInvoke((Action)delegate { Closing = true; ObservationGeneration++; CancelInputs(); Bar.Close(); }); } catch { }
            }
        }
    }
}
'@

try {
    Add-Type -TypeDefinition $source -ReferencedAssemblies @('System.Windows.Forms', 'System.Drawing', 'System.Web.Extensions') -ErrorAction Stop | Out-Null
    [PromptbookDesktop]::Run()
}
catch {
    # Deliberately exclude exception text, which can contain arbitrary request content.
    [Console]::Out.WriteLine('{"event":"unavailable","reason":"The native Windows desktop helper could not start."}')
    [Console]::Out.Flush()
    exit 1
}
