Utility functions for parsing and manipulating agent source data

IMPORTANT: This file implements the unified source-based agent system.
All agent aspects (name, description, profile image, system message) are derived
from a single `source` field to maintain consistency and avoid data duplication.

The agent source format:

-   First line: Agent name
-   PERSONA line: Agent persona/description (optional)
-   META IMAGE line: Profile image URL (optional)
-   Remaining content: System message (after removing META IMAGE line)

Example source:

```
Joe Black

PERSONA Cool guy with sharp mind
META IMAGE https://promptbook.studio/493b7e49.png

You are Joe Black, a cool guy with a sharp mind...
```

This approach ensures:

1.  Single source of truth for all agent data
2.  Easy sharing via the source field
3.  Consistent parsing across the application
4.  Future-proof extensibility
