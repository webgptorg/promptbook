package io.ptbk.android;

import android.content.Context;
import android.system.ErrnoException;
import android.system.Os;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/** Unpacks data privately and starts the engine using the APK-installed executables. */
final class EngineRuntime {
    static Process start(Context context, String dashboardKey, String geminiKey) throws IOException, ErrnoException {
        File runtime = unpack(context);
        File files = context.getFilesDir();
        File nativeDir = new File(context.getApplicationInfo().nativeLibraryDir);
        File node = new File(nativeDir, "libptbk_node.so");
        File links = directory(new File(runtime, "links"));
        File bin = directory(new File(runtime, "bin"));
        File gitCore = directory(new File(runtime, "git-core"));
        File project = directory(new File(files, "project"));
        File home = directory(new File(files, "home"));
        File temporary = directory(new File(files, "tmp"));
        File gemini = new File(runtime, "gemini/bundle");
        File bash = new File(nativeDir, "libptbk_bash.so");
        File ripgrep = new File(nativeDir, "libptbk_rg.so");
        link(bin, "node", node);
        link(bin, "git", new File(nativeDir, "libptbk_git.so"));
        link(bin, "gemini", new File(nativeDir, "libptbk_gemini.so"));
        link(bin, "bash", bash);
        link(bin, "rg", ripgrep);
        // Gemini looks for a packaged ripgrep before considering system paths.
        link(gemini, "rg-android-" + BuildVersion.NODE_ARCH, ripgrep);
        File remote = new File(nativeDir, "libptbk_git_remote.so");
        link(gitCore, "git-remote-http", remote);
        link(gitCore, "git-remote-https", remote);
        for (String line : Files.readAllLines(new File(runtime, "libraries.txt").toPath())) {
            String[] library = line.split(" ", 2);
            link(links, library[0], new File(nativeDir, library[1]));
        }

        ProcessBuilder builder = new ProcessBuilder(node.getAbsolutePath(), new File(runtime, "engine.mjs").getAbsolutePath());
        builder.directory(project).redirectErrorStream(true);
        Map<String, String> env = builder.environment();
        env.put("PATH", bin + ":/system/bin");
        env.put("HOME", home.getAbsolutePath());
        env.put("TMPDIR", temporary.getAbsolutePath());
        env.put("LD_LIBRARY_PATH", links.getAbsolutePath());
        env.put("SHELL", new File(bin, "bash").getAbsolutePath());
        env.put("GIT_EXEC_PATH", gitCore.getAbsolutePath());
        env.put("GIT_TEMPLATE_DIR", new File(runtime, "git-templates").getAbsolutePath());
        env.put("GIT_CONFIG_NOSYSTEM", "1");
        env.put("GIT_SSL_CAINFO", new File(runtime, "cert.pem").getAbsolutePath());
        env.put("GIT_CONFIG_COUNT", "2");
        env.put("GIT_CONFIG_KEY_0", "user.name");
        env.put("GIT_CONFIG_VALUE_0", "Promptbook Android");
        env.put("GIT_CONFIG_KEY_1", "user.email");
        env.put("GIT_CONFIG_VALUE_1", "promptbook@localhost");
        env.put("PTBK_BROWSER_START", "lazy");
        env.put("PTBK_ANDROID_NODE", node.getAbsolutePath());
        env.put("PTBK_ANDROID_GEMINI", new File(gemini, "gemini.js").getAbsolutePath());
        env.put("PTBK_ANDROID_DASHBOARD_KEY", dashboardKey);
        if (!geminiKey.isEmpty()) env.put("PTBK_ANDROID_GEMINI_KEY", geminiKey);
        return builder.start();
    }

    /** The versioned runtime is replaceable. The Git project and its state live outside it. */
    private static File unpack(Context context) throws IOException {
        File parent = directory(new File(context.getCacheDir(), "engine"));
        File runtime = new File(parent, BuildVersion.NAME);
        if (runtime.isDirectory()) return runtime;

        File staging = Files.createTempDirectory(parent.toPath(), "unpack-").toFile();
        try {
            try (ZipInputStream archive = new ZipInputStream(new BufferedInputStream(context.getAssets().open("runtime.zip")))) {
                Path root = staging.toPath();
                for (ZipEntry entry; (entry = archive.getNextEntry()) != null; ) {
                    Path target = root.resolve(entry.getName()).normalize();
                    if (!target.startsWith(root)) throw new IOException("The APK runtime contains an invalid path.");
                    if (entry.isDirectory()) Files.createDirectories(target);
                    else {
                        Files.createDirectories(target.getParent());
                        Files.copy(archive, target);
                    }
                    archive.closeEntry();
                }
            }
            Files.move(staging.toPath(), runtime.toPath());
        } finally {
            remove(staging);
        }
        // Android stops the previous app version during install, so no older engine is still using its cache.
        File[] old = parent.listFiles();
        if (old != null) for (File directory : old) if (!runtime.equals(directory)) remove(directory);
        return runtime;
    }

    private static File directory(File dir) throws IOException {
        Files.createDirectories(dir.toPath());
        return dir;
    }

    /** Alias names expected by Git and the Android linker point to immutable package files. */
    private static void link(File directory, String name, File target) throws IOException, ErrnoException {
        File alias = new File(directory, name);
        Files.deleteIfExists(alias.toPath());
        Os.symlink(target.getAbsolutePath(), alias.getAbsolutePath());
    }

    /** Removes only the replaceable runtime cache, without following its executable symlinks. */
    private static void remove(File file) throws IOException {
        if (!Files.isSymbolicLink(file.toPath())) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) remove(child);
        }
        Files.deleteIfExists(file.toPath());
    }

    private EngineRuntime() {}
}
