# Technical recovery and real host limits

[Principle](_index.md) · [Automatic repair](../automatic-repair.md) · [Health](../../cli/health-sub-engine.md) · [Action audit](../../cli/action-log.md)

| Situation | Expected behavior |
| --- | --- |
| A dependency/parser is missing | Install/configure an appropriate dependency or create a helper within the project's authority, verify it and continue. Do not ask the operator to decide an ordinary implementation detail. |
| A received document cannot be read directly | Investigate formats, available local conversion tools/libraries or another suitable authorized method. Researching a converter does not itself authorize uploading protected documents to an unrelated service. Ask only if the remaining remedy needs a genuine human decision/access. |
| A service interface, connection or supported execution/sandbox setup changes | Diagnose the cause, adjust an authorized client/runtime/configuration or use an available supported alternative. Creating a connector/plugin may be ordinary supporting work. A first failure is not a notification. |
| An authorized service needs a different connection route | Use an available authorized route or configure a suitable helper within the existing mandate. Missing privileges, account access or applicable restrictions remain real constraints. |
| A transient internet/provider outage occurs | Retain a checkpoint and retry/recheck in a cause-aware bounded way; continue independent eligible work. Do not repeatedly ask the user to click Retry. |
| Disk is low and owned disposable cache can be reclaimed | Use the shared Health remediation, preserve credentials/sessions/recovery data and verify capacity. Show progress in the dashboard without attention merely because automatic remediation is running. |
| Disk is exhausted, no safe cleanup remains and provider administration is unavailable | Apply the genuine health/lifecycle limit and request the needed capacity/host action. Explain impact and what autonomous remedies were exhausted. |
| A cable is physically disconnected with no usable alternative | Keep appropriate local supervision and request physical help through an available channel; do not claim a disconnected host delivered a remote notification. |
| Infrastructure can be resized under existing authority | Perform the authorized change, record its external effect in Action log and verify the actual resulting capacity. Otherwise request the missing decision/access rather than assume spending authority. |

Apply these examples with project context. Building a parser/server may instead be content work in a software-product project. A month-long agenda should retain evidence of useful work and recovery, not silently stop after one day on a problem it could have solved by another method.
