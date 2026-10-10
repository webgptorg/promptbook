# Promptbook

## From AI tasks to autonomous agendas

**APT Framework — Agent–Project–Task**  
Whitepaper · version 0.1 · October 2, 2026  
Concept author: Pavol Hejný  
English translation of the Czech original.

> A project should do more than receive tasks from a person. It should have its own agents that understand its purpose, recognize necessary work, and carry it out continuously.

## Abstract

Promptbook is a framework for the long-term autonomous management of projects and agendas. Its aim is not simply to extend the task that AI can carry out without human intervention. It aims to change where work originates: from a person repeatedly submitting individual requests to a project whose agents recognize needs, create tasks, and execute them within their delegated authority.

Its foundation is the **APT Framework**, which separates context into three interconnected parts: **agents**, with roles, goals, and rules; a **project**, containing the managed materials and their meaning; and **tasks**, describing concrete work. This is neither a fixed hierarchy nor a prescribed sequence. It is a convention for organizing long-term context for AI.

In the reference arrangement, all three parts live in a single Git repository. Agent definitions and tasks are versioned alongside the project. Task completion and the changes that fulfill it are recorded in one commit. A deterministic orchestrator selects work, runs checks, and records accepted results. Agents both execute and create tasks: from ongoing findings, external events, and their long-term goals.

An executable engine and a server environment build on this model, allowing operation outside the owner's computer. The long-term vision is a project capable of independently handling development, operations, and other delegated responsibilities, involving people primarily in exceptions and decisions beyond its mandate.

### Scope and status of this document

The technical account is based on the implementation and intentions described by the concept's author. It is not an independent source-code audit or the result of performance testing. Chapter 12 distinguishes described existing capabilities, planned extensions, and the long-term vision. Recommended operating safeguards are not automatically claims about already implemented features. APT is a working name here, not the result of a name or trademark clearance.

### Contents

1. From executing tasks to taking on an agenda
2. A — Agents: roles, goals, and portable expertise
3. P — The project as a context container
4. T — Tasks as a versioned unit of work
5. A controlled work cycle
6. One commit: the result and the task's status
7. Where new work comes from
8. Lasting value and a replaceable runtime
9. Framework, engine, and agent server
10. The boundaries of autonomy and operating safeguards
11. Three examples of one architecture
12. Implementation status and the long-term vision

## 1. From executing tasks to taking on an agenda

The starting problem is a way of working in which a person remains the main initiator of work. They submit a request, AI processes it, and waits for another. Even the ability to carry out a substantial task independently does not itself change this relationship. The person still decides what needs doing next.

Promptbook focuses on a different relationship: a person entrusts the system with more than a task — an **ongoing agenda**. This might be managing a website, preparing accounting materials, communicating with customers, or developing a digital product. An agenda includes purpose, materials, rules, work, and responsibility for its continued progress.

The difference is not whether an agent can work for an hour or several days. It is whether a person must restart the system after every result. An autonomous agenda must recognize the next need, assess it against its purpose, and create executable work. Equally important is the ability to do nothing when no useful, authorized work is needed.

### Three parts of one context

APT distinguishes three questions. The **agent** defines who works, what they are working toward, and which rules they follow. The **project** defines what is being worked on and in what environment. The **task** defines which specific change or activity should happen now.

These parts form a connected whole, not a sequence of “first agent, then project, then task.” An agent changes the project. A task may change an agent's definition. A task may produce another task. A project change may reveal a new need. An agenda is this whole in long-term operation; it is not what the letter A stands for.

For a software product, the project and its source files may be the natural focus. In customer communication, agents and their communication rules may take center stage. When processing individual requests, tasks may dominate. APT retains the same concepts across these perspectives without turning different emphases into different frameworks.

### A convention, not a new kind of data

Each part can technically be stored in many ways. APT contributes a shared convention: distinguish long-term instructions, managed state, and concrete work, so that it is clear what travels between projects, what versioning preserves, and what can be recreated.

This does not mean loading the entire repository into every model request. The repository is an organized source of context. Relevant parts are selected for a particular run. Long-term continuity should reside in that source, rather than depend on an uninterrupted conversation with one model.

## 2. A — Agents: roles, goals, and portable expertise

In APT, an agent is a defined actor. Its identity comes primarily from its role and goal within the agenda, not from a model's name. Typical roles include Developer, Frontend Developer, Copywriter, Accountant, and Security Reviewer.

The most important part of a definition is its **goal**. A developer's goal might be to maintain the project's technical health over time and expand its functionality. A security agent's goal might be to identify and reduce security risks. The goal persists even when the agent has no assigned task.

Rules define how work is done. A developer might follow conventions, file-size limits, or a requirement to add tests. A copywriter follows rules for tone. A legal agent follows rules for verifying evidence and referring uncertain conclusions to a person. Knowledge, skills, and required tools complete the definition. A role's name alone confirms neither professional qualification nor unlimited authority to act.

### Inheritance and specialization

Promptbook defines agents in `.book` files with a defined syntax. The base agent, **Adam**, provides general rules that others can build on. Specializations can build above it: a general developer from Adam, then frontend and backend developers from that developer.

Inheritance shares common instructions without copying them repeatedly. A change to the shared base can also change several roles' behavior. It is therefore important to preserve traceable versions of inherited definitions and verify resulting behavior when they change. Precise conflict-resolution rules and any multiple inheritance belong in the language specification, not in unspoken assumptions about this model.

### Imports and the connection to a model

A general agent definition can be useful across projects and organizations. A project may import it and add local context. A planned agent catalog is intended to make this reuse available through installable definitions. Transferring a definition does not transfer credentials or automatically grant access to company data.

Of the three parts, the agent is closest to the model and its execution environment, also called a _harness_. It is nevertheless not identical to a particular model. The described framework selects a model according to the combination of the agent's goal and abilities and the nature of the task. This routing separates intent from the means of execution; it does not guarantee that arbitrary models can be exchanged without verification.

## 3. P — The project as a context container

The project is a **context container**: an organized collection of materials and information on which an agenda works. Unlike an agent, it has no prescribed uniform internal format. In the implementation, it can be any folder. A Git repository is recommended and is essential to shared versioning. Without Git, the logical APT division remains, but the described benefits of shared history and reverting changes do not.

A project can contain application source files, documentation, invoices, business materials, communication rules, or scripts. It need not be software or a time-limited project in the management sense. In APT, it also describes a workspace managed over the long term.

### Orientation from general to specific

The usual entry point is `README.md`: it explains what the project is, what it is for, and how it is organized. Additional instructions may live in `AGENTS.md`, `CLAUDE.md`, or domain documentation. The AGENTS.md standard similarly distinguishes introductory documentation for people from instructions for agents. [4]

The directory structure helps refine context gradually. Project-wide documentation provides orientation; documentation for an individual part adds detail. Directory depth does not measure importance, however. A file in a deep subfolder may be decisive for a task, and a local rule may be more specific than a general one. AGENTS.md explicitly accommodates local instructions for subprojects. [4]

### Physical location is not conceptual classification

Agent and task definitions also live inside the root folder. Physically they are part of the same workspace, but in APT they remain distinct A and T categories. Saying “the project contains agents and tasks” describes storage, not the elimination of the distinction between the three parts.

Operational files must also be distinguished. `.git` holds version history. The framework's temporary folder, `.promptbook` in the described arrangement, holds rebuildable operational artifacts and caches, and should typically be ignored by Git. These names are implementation conventions, not the essence of APT.

### External context and the repository boundary

“Keep context together” does not require putting every database, attachment, or production secret into Git. A project can refer to external storage and services. Continuity requires a comprehensible map of these sources, access rules, and identification of the evidence relevant to decisions.

A reference to a changing source does not preserve its historical content. To substantiate a decision later, it may be appropriate to retain the relevant version, a securely stored snapshot, or another identifiable record. Credentials belong outside versioned files. A repository can be the source of truth for an agenda's definition and recorded state without being the sole store of all its data.

## 4. T — Tasks as a versioned unit of work

A task expresses specific work within an agenda. It may request creating an application, changing a menu, preparing materials, analyzing an incident, or proposing further tasks. Its output need not be code: it may be a document, a finding, or a new plan.

In the described implementation, tasks are Markdown files in the `prompts` folder, generally one file per task. Moving to the `.book` format is a planned extension. Renaming the folder to `tasks` or `PRDs` would not change the principle: the specification and its status are readable, versioned parts of the workspace.

### From the first request to ongoing development

Initialization can begin in an empty folder or an existing project. It adds basic agents and sample tasks without necessarily replacing the existing file organization. In an empty project, the first task can describe the intended product and create its initial form.

The lifecycle does not end there. Subsequent tasks work on previous tasks' results in the same environment. Initial creation and later maintenance are therefore not separate disciplines. They use the same context, roles, and verification mechanism.

### Priority, assignment, and dependencies

A task may have a priority, a specific agent or group of agents, dependencies on other tasks, and an earliest start date. A legal agent, copywriter, and developer might prepare terms and conditions; a developer and data specialist might prepare a dashboard.

File names prefixed with year, month, and sequence number provide a deterministic default order. Priorities and dependencies refine it. A sequence number does not replace a dependency: even a high-priority task must satisfy its start conditions.

A date also differs from an event. “Start on Monday” can be evaluated using time. “Start after the new model is announced” requires a confirmed signal from the outside world. A date may be a planning proxy, but is not proof the event occurred.

### Specifications and evaluability

For reliable execution, a task should describe the intended outcome, important constraints, and how to verify it. General project checks answer whether the project remains within defined limits. Task acceptance criteria answer a different question: whether the requested work was actually done.

When several agents work together, the system needs to define who prepares the result, who assesses it, and when work is handed over. A list of assigned roles alone defines neither safe concurrent editing nor rules for resolving disagreements.

## 5. A controlled work cycle

APT separates agent reasoning from deterministic execution control. Models propose solutions and do the work. The orchestrator manages task selection, runs checks, and creates commits. Agents normally work on the current working tree; access to the complete history need not be part of every run.

The basic cycle first verifies the initial state. Failed checks create a repair task. If checks pass, an eligible task is selected according to scheduling rules. Execution is followed by further checks and any necessary repairs. Only an accepted result is recorded as completed work.

> Observe state → select work → make a change → verify the result → record the accepted state.

### What “the project is in a good state” means

A project can define checking scripts, or _checks_. A check produces a machine-evaluable pass or fail for a condition. In software this could mean unit tests, end-to-end tests, linting, type checking, or spelling checks. For accounting materials it could mean checking totals and relationships between records.

“Good state” means **satisfying the defined checks**, not proving the absence of errors. A check verifies only what it actually measures. Matching totals do not establish the correctness of accounting judgment; a successful build does not establish a dashboard's usability. Project checks must therefore be combined with verification of the specific task.

Agent-based review may complement properties that are difficult to assess through deterministic scripts. It is a planned layer of verification, not equivalent to deterministic proof. Scripted checks can themselves be unstable if they depend on a network or a changing environment; a binary result alone does not guarantee repeatability.

### Conditions for accepting a change

The intended result is a history of accepted, verified transitions rather than a sequence of partial attempts. A commit itself does not guarantee quality: Git normally records the staged index's contents. The orchestrator must enforce verification of the corresponding contents. [2]

To preserve this property, another change must not slip in unnoticed between checking and committing. The basic solution is to serialize writes; concurrent work requires isolation and fresh verification of the integrated result. After a synchronization conflict, an earlier successful test is not sufficient.

A repair cycle in production needs a budget and a maximum number of attempts. Repeated failures should block the work and refer it to a person instead of consuming resources indefinitely. This is a recommended operating safeguard above the basic cycle.

## 6. One commit: the result and the task's status

Keeping tasks inside the repository has a concrete purpose: **the work's result and the record of its completion can be saved as one versioned change**. Git works with snapshots of versioned files; code, documentation, agent definitions, and task status can therefore belong to the same snapshot. [1]

Before execution, for example, an unresolved task requests a customer dashboard. After execution, a single commit contains the implementation, related tests, and the task marked complete. In the described implementation, the task's contents also serve as the commit message. History thus connects the request, the change, and the recorded completion state. If work creates further tasks or updates an agent definition, those changes may also form part of the same transition.

We call this **shared versioning of work and its result**. There is no need to synchronize completion in an independent task database with the corresponding file version: both are in the same commit. A tool over the repository can display a task queue without being the sole location of that information.

### Reverting changes and working in branches

A complete revert of such a commit reverses the task-status change alongside the implementation. If the task existed as unresolved before implementation, it may reappear among unresolved tasks. This follows from shared storage, not from a special integration mechanism. Git revert creates a new commit reversing earlier changes; it does not simply erase history. [3]

This property has precise conditions. If a task was first created and completed in the same commit, a complete revert may remove it rather than reopen it. Reverting only some files may not revert its status. Reverting an older change may require conflict resolution and does not verify whether subsequent dependent tasks still make sense. [3]

Within branches, files and tasks have their corresponding versions. Returning to an older state lets you read both as they were. Merging still requires checking semantic conflicts: “complete” cannot be carried over without verification if the merged result no longer preserves the functionality.

### What this principle does not guarantee

Shared versioning guarantees a joint record, not the truth of an arbitrary “done” label. The verification cycle must support that truth. Git also does not reverse changes outside the repository. A sent email, completed payment, or production-data change does not cease to exist because a commit was reverted.

A reopened task may therefore not be immediately eligible for execution again. The owner must be able to amend or block it to avoid repeating a rejected solution. Particularly for external actions, the actual state must first be established and unwanted repetition prevented. For these tasks, shared versioning is part of the record, not a universal transaction over the outside world.

## 7. Where new work comes from

A system that only executes a prepared queue has nothing to do once the queue is exhausted. Running on a server does not change this. Long-term autonomy arises only when the system can also recognize and formulate work.

Creating a task in APT is an ordinary file change. While executing one task, an agent can therefore create another. A research agent can investigate a problem and prepare an implementation task for a developer. A reviewer can formulate follow-up work instead of making a direct repair. Planning becomes a traceable output of work rather than merely transient conversational content.

### Three sources of tasks

**A person** can submit requests, change priorities, and set direction. Autonomy does not remove that option; it simply stops making it a prerequisite for every next step.

**Ongoing work** can reveal dependencies, adjacent problems, or the need for more research. An agent creates a follow-up task without having to expand the original task without limit.

**Agent goals and external events** can generate work even with an empty queue. Triggers may include user feedback, an email, an error log, monitoring alerts, or new information relevant to project security.

### The agent as both executor and initiator

A security agent may have a long-term goal without a specific assigned task. It learns of a potential risk from an external report, assesses its relevance, and creates a verification task. It can then prepare a repair task for a developer and a verification task for another reviewer. Every transition produces a readable record in the agenda's context.

The long-term cycle therefore includes observation, interpretation, and planning as well as execution. A goal determines why a signal matters. A task turns it into concrete work. Checks and the recorded result feed information back into the project.

The text of a goal alone cannot wake a sleeping process. Operation needs a trigger: an event, periodic evaluation, or another signal. It must also consolidate signals and determine when another task is unnecessary. Autonomy is not an obligation to create endless work; it is the ability to act usefully and in time without daily human task assignment.

## 8. Lasting value and a replaceable runtime

A second significant benefit of APT is distinguishing valuable long-term context from rebuildable means of processing it. The model, provider, and runtime can change. The project should not lose its purpose, rules, and results as a consequence.

This distinction is a separate axis from the A–P–T triad. It is not the case that everything in one category is lasting and everything in another is disposable. Each category may include both authoritative inputs and derived representations.

### What to preserve

Long-term value resides in project intent, current managed materials, source agent definitions, tasks, decisions and their evidence, acceptance criteria, checks, and relevant history. If experience from a task improves an agent's rules or knowledge, that improvement should be reflected in the maintained definition or documentation.

This kind of learning does not require changing model weights. It can involve instructions, examples, tools, or project rules. The change must remain traceable and reviewable; an agent should not silently change its own mandate.

### What can be recreated

Caches, derived indexes, assembled prompts, and temporary outputs may be rebuildable if their inputs and the procedure for creating them are preserved. Being AI-generated does not itself make a file safely disposable. Generated and subsequently verified source code may be an authoritative part of the project.

Operational records also require a distinction. A helper log may sometimes be discarded. A record needed to substantiate an external action or explain an incident belongs in durable evidence, not merely in deletable cache.

### Changing models without losing identity

When switching to another model, the role definition, goal, rules, project, and tasks should be preserved. Their executor and possibly tool adapter change. Compatibility must be verified on representative tasks and checks: retaining a textual definition does not guarantee identical behavior.

Context portability is therefore not a promise of identical results. It is an architectural separation of long-term investment in an agenda from a particular way of running it. The same repository snapshot helps traceability; with a different model, environment, or external data, it need not produce the same result.

## 9. Framework, engine, and agent server

Promptbook is usefully described in three layers. Separating them explains the general principle without depending on a particular deployment method.

The **APT framework** defines context organization, relationships between agents, project, and tasks, and shared versioning. This is the conceptual layer: how to describe an agenda and preserve continuity.

The **CLI-executable engine** executes this model over a specific folder or repository. It initializes the workspace, processes tasks, runs checks, and manages acceptance of changes. The described CI-like mode can automatically synchronize changes with a remote Git repository through pull and push.

The **agent server** provides an environment for persistent execution. It enables operation outside the owner's computer and provides an interface for interacting with the agenda. According to the author's account, an installable server package exists, with automated domain assignment and an installation script verified on Fedora and in deployment on DigitalOcean. This document does not assume verified compatibility with every cloud environment.

### Operation belongs to the project, not the workstation

A project has its own agents, tasks, and locally installed tool version. Different projects can therefore use different engine versions and role configurations. Their lifecycle need not depend on whether a particular developer turns on their computer or updates a global tool.

A project-level installation does not itself provide security isolation. Running multiple agendas separately requires addressing permissions, resources, and concurrent access. Likewise, automatic push protects only synchronized versioned content; it does not replace external-data backups and full server recovery.

### Relationship to existing approaches

Project-local instructions are not in themselves a new category; the public AGENTS.md format directly supports them. [4] GitOps likewise relies on versioned descriptions of desired state and ongoing reconciliation with reality. [5]

The contribution of the described Promptbook arrangement is therefore not a claim that other tools lack these elements. It is their connection to lasting roles, goal-driven creation of new work, and shared versioning of tasks and results. Its distinguishing intent is an independently operated agenda, not just a more convenient request interface.

## 10. The boundaries of autonomy and operating safeguards

Autonomy should always be relative to a mandate: what the system may decide, what resources it can use, and when it needs its owner. The following principles express recommended operating requirements, not a list of confirmed features in the current implementation.

### Authority is not the same as a goal

“Keep the product secure” does not authorize an agent to make any intervention. A role needs appropriate technical permissions, a scope of permitted changes, and escalation rules. Tool access should use the smallest necessary scope. Spending limits, irreversible actions, and changes to the rules themselves require special treatment.

The owner should receive decisions the system genuinely cannot make within its mandate: missing access, conflicting goals, repeated failures, or requests with significant impact. The owner should not have to approve every minor detail, but must retain the ability to stop and redirect execution.

### Protecting checks and instruction sources

If an agent can freely rewrite the test intended to verify its work, passing loses its meaning. Changes to checks must be distinguished from bypassing requirements. Ordinary edits to agent definitions must similarly be distinguished from changes to permissions or higher-level rules.

An email, user feedback, or external website content can inform work without automatically authorizing changes to system instructions. Operational design must prevent untrusted data from becoming higher-priority instructions. Neither an agent's goal nor placing text in a project folder resolves this trust boundary on its own.

### External actions and recovery

Actions outside the repository need durable result records and protection against repetition. After an interruption, it may be locally unclear whether a service already executed a request. The design should therefore use operation identifiers, checks of actual state, and, where the service allows it, idempotency: safely repeating a request without multiplying its effect.

After a revert, branch change, or server recovery, tasks marked incomplete cannot all be blindly executed again. Their external effects must be taken into account first. Binding submissions and financial operations must also respect the owner's permissions and approvals; this whitepaper does not replace professional legal or accounting assessment.

### Traceability and costs

Alongside accepted changes, operation should retain appropriate records of unsuccessful attempts, versions used, supporting evidence, and owner interventions. A clean Git history may not be a complete execution record and is not itself an immutable audit archive.

Budgets, repair limits, and suppression of duplicate signals guard against agents creating tasks faster than they create value. Safely pausing is a legitimate outcome of autonomous decision-making, not automatically its failure.

## 11. Three examples of one architecture

The following scenarios illustrate uses of the model. They are not claims of completed integrations across these domains or measured deployment outcomes.

### Managing and developing a web application

The project contains source files, documentation, product intent, and tests. A developer expands functionality, a copywriter manages text, and a security agent assesses risks. An initial task may create the application; later tasks extend it progressively.

Later, monitoring detects a recurring error. An agent turns it into a reproducible task; a developer prepares a fix and a regression test. After verification, one commit contains the fix and the completed task. Deployment and verification of actual operation are further explicit steps; they cannot automatically be equated with a successful commit.

### Working with accounting materials

The project contains or references invoices, bank records, accounting procedures, and relevant communication. An accounting agent organizes materials and tracks completeness; another role assesses uncertainties and prepares questions for expert judgment.

Receiving a new invoice can trigger processing work. Inconsistent materials create a follow-up task to find missing information. Checks verify formal consistency and relationships. Preparing a filing, approving it, and actually submitting it have different states and authorities; technical checking does not take over professional responsibility.

### Communicating with customers

The project consists of product knowledge, communication rules, templates, and safely accessible history. A support agent handles requests, a copywriter improves wording, and another role assesses exceptions.

Repeated questions may lead not only to individual replies but also to tasks to expand documentation or change a confusing part of the application. The agenda moves from processing messages to addressing their causes. Drafting a reply and sending it are distinguishable operations because the latter has an effect outside the repository.

## 12. Implementation status and the long-term vision

### The described existing core

According to the concept's author, the existing core includes `.book` agent definitions, inheritance from the base agent Adam, working over a project folder, Markdown tasks in `prompts`, assignment, prioritization, dependencies, and time conditions. Model selection according to agent and task is also described.

The account also includes an engine with a check-and-repair cycle, orchestrator-created commits linking changes to task completion, agents creating further tasks, handling external signals, remote Git synchronization, and server deployment. Availability of specific connectors and precise scheduler behavior must be established by the implementation documentation for the relevant version.

### Planned extensions

Explicitly planned directions include tasks in `.book` format, agent-based checks supplementing deterministic checks, and a catalog for installing reusable agents. This document assigns them no release date and does not present them as current features.

The operating safeguards in Chapter 10 are requirements for trustworthy deployment. The extent of their actual enforcement must be verified separately. This whitepaper contains no measured success rate, guarantee of full autonomy, or comparative competitor benchmark.

### How to assess progress

The number of completed tasks alone is not a useful measure. What matters is how much meaningful work the agenda accepts without operational human intervention, how much time and cost a verified result requires, and how often changes need repair or reversal.

For a pilot, it makes sense to track the frequency and reasons for human intervention, time from signal to verified result, repair-cycle costs, and impact on the agenda's actual goal. Metrics must be evaluated together so that reducing human intervention does not come at the expense of quality or conceal failures. These are proposed evaluation measures, not published Promptbook results.

### A project that maintains its own continuity

The long-term vision is a project with purpose, its own roles, and the means to act. It identifies necessary work, develops, communicates, monitors operations, and addresses risks. For a digital product, this vision might also include promotion, payment management, and generating economic returns for its owner.

This document does not claim that such a state has been universally achieved. Full independence across technical, commercial, and legal activities remains a long-term direction, dependent on model capabilities, check quality, permissions, and the specific environment.

**Promptbook's purpose is to move people from continuously assigning subtasks to owning intent, rules, and responsibility.** APT provides a lasting structure for this: agents that know why they work; a project that carries context; and tasks that connect intent to verifiable changes.

## Appendix: an illustrative project structure

The following tree illustrates the separation described in this document. It is neither a complete installation template nor a normative specification of names or capitalization.

```text
project/
  README.md                 orientation and intent
  AGENTS.md                 project instructions
  Agents/                   A: role definitions
    adam.book
    developer.book
    security-reviewer.book
  prompts/                  T: tasks and their status
    2026-10-001-initial.md
    2026-10-002-dashboard.md
  src/                      P: example managed content
  docs/                     P: documentation and decisions
  checks/                   P: example check location
  .git/                     version history
  .promptbook/              rebuildable operational artifacts
```

For a non-software agenda, the relevant materials or references replace `src`. The nature of the content is open. What matters is distinguishing roles, context, tasks, and operational artifacts, not a particular directory tree.

### Sources and technical foundations

The concept and claims about Promptbook are based on Pavol Hejný's underlying account from October 2, 2026. The following primary sources support only the referenced properties of Git and related approaches, not Promptbook's implementation. The Czech original records verification on October 2, 2026.

[1] Git / Pro Git. **What is Git?** Snapshots of versioned files.  
https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F

[2] Git. **git-commit — Record changes to the repository.** Index contents and commit creation.  
https://git-scm.com/docs/git-commit

[3] Git. **git-revert — Revert some existing commits.** Reversing changes, new commits, and conflicts.  
https://git-scm.com/docs/git-revert

[4] AGENTS.md. **An open format for coding-agent instructions.** Project and local instructions.  
https://agents.md/

[5] OpenGitOps. **GitOps Principles, v1.0.0.** Declarative and versioned state, automatic retrieval, and continuous reconciliation.  
https://opengitops.dev/
