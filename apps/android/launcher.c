#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <unistd.h>

/* Run the packaged Gemini script through the packaged Node. Android allows exec
 * of this APK-installed binary, while the JavaScript is read from app storage. */
int main(int argc, char **argv) {
    const char *node = getenv("PTBK_ANDROID_NODE");
    const char *script = getenv("PTBK_ANDROID_GEMINI");
    if (node == NULL || script == NULL) {
        fputs("The Promptbook Android runtime is missing.\n", stderr);
        return 127;
    }

    pid_t owner = getppid();
    if (prctl(PR_SET_PDEATHSIG, SIGTERM) == -1 || owner == 1 || getppid() != owner) {
        return 1;
    }

    char **args = calloc((size_t)argc + 2, sizeof(*args));
    if (args == NULL) return 1;
    args[0] = (char *)node;
    args[1] = (char *)script;
    memcpy(args + 2, argv + 1, (size_t)argc * sizeof(*argv));
    execv(node, args);
    perror("Starting bundled Node.js");
    return 127;
}
