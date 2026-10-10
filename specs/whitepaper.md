# Promptbook

## From AI tasks to autonomous agendas

**APT Framework — Agent–Project–Task**  
Concept author: Pavol Hejný  
Whitepaper · revised October 10, 2026

> A project should do more than receive tasks from a person. It should have agents that understand its purpose, recognize necessary work and carry it out within their mandate.

## Abstract

Promptbook explores the long-term autonomous management of projects and agendas. Its aim is not merely to extend how long AI can execute a request. It changes where work originates: from a person repeatedly assigning individual steps to an agenda whose agents recognize needs, formulate tasks, verify results and continue appropriately.

The **APT Framework** separates context into three connected parts: **agents**, carrying roles, goals, rules and knowledge; a **project**, carrying managed materials and context; and **tasks**, describing bounded work. This is a convention for organizing context, not a fixed hierarchy or a prescribed order of creation.

In the reference design, project files, agent definitions and tasks live together in Git. Each accepted task result and its completion record share one commit. Agent reasoning is coordinated by an engine that manages execution, checks and persistence. The engine can operate indefinitely, including periods in which the correct action is to wait.

This paper describes principles and a reference design, not an audit of implemented capabilities. The [product specifications](_main.md) define the concrete target behavior. External agents and externally hosted task trackers are long-term directions, not requirements implied by their inclusion here.

## Contents

1. From executing tasks to taking on an agenda
2. A — Agents: roles, goals and portable expertise
3. P — The project as a context container
4. T — Tasks as a versioned unit of work
5. A controlled work cycle
6. One commit: the result and completion
7. Where new work comes from
8. Lasting value and a replaceable runtime
9. Framework, engine and persistent operation
10. The boundaries of autonomy
11. Three examples of one architecture
12. Scope, evaluation and the long-term vision

## 1. From executing tasks to taking on an agenda

In a request-driven workflow, a person remains the initiator: submit work, receive a result, decide what to ask next. Even a very capable coding agent does not change this relationship simply by completing a larger request.

An **agenda** is a longer-lived responsibility: maintaining a website, organizing accounting materials, communicating with customers or developing a product. It includes purpose, materials, rules and responsibility for continued progress. An agent should recognize useful next work rather than require the owner to restart the process after every result. Equally, it must be able to conclude that no useful authorized work is needed.

APT asks three questions. **Agent:** who works, toward what goal and under which rules? **Project:** over which materials and environment? **Task:** what concrete activity should happen? These parts can change one another. An agent changes the project; a task may change an agent; a result may create another task. Agenda names the whole in continuing operation, not the meaning of the letter A.

Physical storage is a separate axis. Each APT component can conceptually be internal, external or a combination. A local task can concern an external spreadsheet; a future team can combine local and external agents. This does not mean every storage or integration mechanism is supported by the reference product.

## 2. A — Agents: roles, goals and portable expertise

An agent is identified by its role and goal, not primarily by a model name. Developer, Copywriter, Accountant and Security Reviewer express responsibilities. Rules, knowledge, skills and available tools shape how those responsibilities are exercised. Naming a role confers neither qualifications nor unlimited authority.

The goal persists between tasks. Maintaining security or improving customer understanding can remain meaningful even when the agent has no current assignment. A persistent role does not require a model to be continuously running or consuming resources.

Inheritance allows specializations to share foundations: a general developer may have frontend and backend descendants. Changing a foundation can affect several roles, so its effective instructions and origin must remain understandable. **TEAM** expresses a different relationship: whom an agent can consult and under what circumstances. Consultation is not organizational subordination; reciprocal team relationships are meaningful even though inheritance must terminate.

The reference design distinguishes ordinary project roles, editable supporting core roles and engine-defined special references. Manager supports work assignment; Teacher supports learning. User represents access to the person. Expert supplies knowledge of the actual running Promptbook engine, rather than a project copy that becomes stale. These distinctions organize the reference system; they are not claims that every APT implementation needs identical named roles.

An agent remains separate from its harness and model. Execution choices can reflect the task, capabilities, permissions and cost without replacing the agent's lasting identity. Preserving the definition does not guarantee identical behavior across models.

### External agents: a long-term direction

Reusable definitions may eventually be installed from an agent store, imported from another source or connected to remotely operated agents through inter-agent protocols. A team could then combine internal and external participants under compatible consultation semantics. This is a future interoperability direction. It does not automatically transfer credentials, tool permissions or trust, and it is not part of the current external-agent implementation scope.

## 3. P — The project as a context container

The project is an organized collection of materials and meaning, not necessarily a software repository or a time-limited management project. It can contain source code, documentation, invoices, communication rules, research or references to other systems.

A directory in a Git working tree is the reference product's concrete workspace. Project-local agents and tasks are physically inside it while remaining separate A and T categories. Git provides the shared history of definitions, managed files and accepted work. APT as a conceptual convention does not depend on every possible project using this exact storage arrangement.

Documentation provides orientation from general intent to relevant local detail. A README can explain purpose, and agent-oriented instructions such as AGENTS.md can explain working conventions. Directory depth is not importance; local rules can be decisive for a particular task. [4] The engine selects relevant context rather than loading the entire project into every model request.

### Internal and external project context

Keeping context together means keeping it comprehensible, not putting every database, attachment or secret in Git. Public websites are external context. Private documents and services are also context when the user has provided appropriate access. A map of sources, access boundaries and relevant evidence supports continuity; a URL alone does not preserve the source's past contents.

In the reference design, agents share a project browser and its persistent login sessions. The user can perform login or two-factor authentication on the real site, after which work continues in that browser context. This is distinct from keeping a password database in the project. Session data remains sensitive and outside Git.

Operational storage also needs distinctions: some caches can be rebuilt, while pending questions, recovery evidence and browser sessions cannot simply be treated as disposable. Being ignored by Git is not the same as having no lasting value.

## 4. T — Tasks as a versioned unit of work

A task expresses bounded work with a beginning and an end. Its result can be code, a document, a finding, an agent improvement or another task. Book provides a readable language for both roles and tasks while keeping their meanings distinct: an agent describes who works; a task describes what is to be done.

Task titles are human descriptions, not necessarily unique identities. References connect tasks reliably despite repeated titles. Tasks can have priorities, execution requirements, dates, parents and predecessors. Priority does not erase a dependency, and a completion deadline is not the same as the earliest permitted start.

The source of a task is provenance, not a different execution type. A person may supply it; the engine may create an assignment enquiry; an agent may propose research; Teacher may receive an improvement task. All should remain understandable work with the same verification and recording discipline.

Initialization and maintenance are one lifecycle. An initial task can adapt a prepared workspace to the owner's intent; later tasks develop the same agenda. A task should state the intended result and important constraints without prescribing every internal implementation detail. Project checks and task-specific acceptance answer different questions and complement one another.

### External tasks: a long-term direction

Tasks may eventually be sourced from systems such as GitHub Issues, Jira or Trello, alone or alongside project-local tasks. Their storage would be external while their APT meaning remains concrete work. This is not required in the current product specification. In particular, an external tracker does not automatically share Git's atomic completion/result record; integration must preserve a clear relationship without pretending an external update is part of the same Git transaction.

## 5. A controlled work cycle

APT separates agent judgment from execution control. Models propose and perform work; the engine selects eligible tasks, manages checks, records accepted results and handles interruptions. In the reference engine there is one active project task at a time, even when several agents collaborate within it.

> Observe state → select work → perform it → verify the result → record the accepted transition.

If a task lacks an execution assignment, Manager's preceding task can supply it. After an open agent completes work, a subsequent teaching task can improve that agent. These are visible tasks, not hidden parallel mechanisms outside the work cycle.

Checks establish specified properties, not universal correctness. Passing tests does not prove usability; consistent accounting totals do not establish professional accounting judgment. A requested outcome still needs to be evaluated. Checks that change files must verify the content actually accepted, and a failed check cannot be turned into success by removing the requirement. [2]

Resilience does not mean ignoring failure. Repair needs bounds; ambiguous changes need reconciliation; missing authority may need the user. The continuing process should remain observable and recover when safe instead of either crashing on ordinary problems or spending without limit.

## 6. One commit: the result and completion

Keeping tasks with project files enables **shared versioning of work and its result**. A task's accepted changes, completion record and newly created follow-up definitions can belong to one commit. The assignment corresponds to that commit's message, connecting intention, result and recorded completion. Git's snapshot model supports this relationship. [1]

A teaching task then has its own result commit rather than silently changing the earlier task's result. Checks and formatting performed as part of one task belong to that task's accepted transition. Runtime diagnostics can record failed attempts without declaring each attempt a completed result.

A complete revert reverses both the result and its completion change. If a task existed unfinished before that commit, it can reappear as unfinished. If it was created and completed together, reverting may instead remove it. Partial reverts and conflicting later changes require interpretation; a revert creates a reversing commit rather than erasing history. [3]

This principle has limits. A done label is not proof of correct work. A merge must preserve the result's meaning. Git does not unsend an email, undo a payment or reverse a browser action. Before repeating reopened work, the actual external state and permission to act must be established.

## 7. Where new work comes from

A prepared queue eventually empties. Moving its runner to a server does not, by itself, create autonomy. APT distinguishes explicit requests, work derived from other tasks and work recognized from lasting goals.

A research result can become an implementation task. An incomplete assignment can lead to a Manager prerequisite. Experience from completed work can produce a teaching task. Creation of these tasks is itself a project change and can be recorded with the work that justified it.

When the reference project's backlog is genuinely empty, including future scheduled work, the engine can periodically create an enquiry asking an ordinary agent whether its goal warrants new tasks. That enquiry is materialized, performed and recorded like other work. Its result may be a future-dated task, useful immediate work or a reason to do nothing.

A no-work result should lead to waiting, not an immediate repeated call. Existing future tasks are not an empty backlog. The purpose of autonomy is useful continuity, not endlessly manufacturing tasks or commits. External observations can inform decisions, but a time passing is not proof that a real-world event occurred.

## 8. Lasting value and a replaceable runtime

Project intent, definitions, useful knowledge, assignments, accepted results and evidence are investments that should survive a change of model or execution environment. This distinction is separate from A–P–T: each part can contain both authoritative material and derived representations.

Learning can mean improving a maintained definition from experience rather than changing model weights. The reference design makes this an explicit Teacher task. Open agents permit improvement, optionally within natural-language limits; closed agents do not. Changes to knowledge are not automatic permission to change rules or broaden the mandate. Learning must be reviewable and must not recursively teach its own teacher forever.

Expert illustrates a complementary kind of context: knowledge that belongs to the installed engine. A project's custom definitions should persist, while engine introspection should match the version actually executing them. Upgrading the engine must not leave its native expertise frozen in an unrelated project file.

Generated material is not automatically disposable. A verified result or valuable behavior may deserve preservation even though another implementation could realize it. Conversely, caches and derived prompts may be recreated when their required inputs are retained. The important boundary is what has authority and value, not simply whether a file was written by AI.

Retaining definitions does not promise identical behavior across models or environments. Compatibility must be evaluated; changing external data or runtime capabilities can change results.

## 9. Framework, engine and persistent operation

The **framework** explains the organization of context and continuity. The **engine** realizes it over a concrete project. **Persistent operation** keeps that engine available between tasks, restarts and human interactions. These are distinct concerns, not necessarily separate products.

The reference product is one CLI, `ptbk`, installable globally or in a project. A finite run processes prepared work with a selected execution configuration. Start operates the ongoing agenda, choosing among available authorized agents and harnesses. Different projects can retain different installed engine versions.

A terminal, a small localhost page and an API are views and controls over the same process. Questions have their own meaning independently of whether they came from TEAM, setup or another operation, and independently of the channel carrying the reply. Human consultation is not limited to a chat window.

Project-local installation is not a security sandbox. Automatic restart is not protection against every failure, and remote Git synchronization is not a backup of external services or browser sessions. These distinctions keep persistence from being confused with unrestricted authority or universal recoverability.

Project-local instructions and versioned desired state also appear in approaches such as AGENTS.md and GitOps. [4][5] Promptbook's intended contribution is their connection with lasting roles, formation of new work and shared task/result history, not a claim that every individual component is unprecedented.

## 10. The boundaries of autonomy

A goal and a permission are different things. A security goal does not authorize arbitrary changes; a customer-support role does not permit every external message. The owner defines mandate, resource limits and when human involvement is necessary.

The system should ask for decisions it cannot make legitimately: missing access, conflicting goals, uncertain external outcomes or significant changes of authority. It should not require approval for every harmless step, but the owner must retain the ability to pause, stop and redirect it. Silence is not approval.

External content is evidence, not a higher-priority instruction. A website or email must not silently rewrite agent rules. A test modified only to accept a failed outcome no longer provides its intended safeguard. Learning and task execution must respect these boundaries.

External actions need records and protection against unintended repetition. After a crash, the local process may not know whether a service completed a request. Recovery should check actual state and use safe retry behavior where supported, rather than equate an unfinished file with an unperformed action.

Bounded repairs, consultation limits and duplicate suppression protect against recursive or worthless work. Traceability includes meaningful failures and user decisions, not just successful commits. A visible safe pause is a legitimate outcome, not necessarily a failure of autonomy.

## 11. Three examples of one architecture

These are illustrations of the model, not claims that every integration or professional capability is complete.

### Managing a web application

The project carries source, product intent, documentation and tests. Developer, Copywriter and Security Reviewer serve different goals. A finding becomes a task; missing routing is resolved; the change is checked and committed with completion. Deployment and verification of live operation remain explicit activities, not automatic consequences of having a commit.

### Working with accounting materials

The project contains or references invoices, records and working procedures. An agent can organize material and identify missing evidence; uncertain judgments can become questions or specialist work. Private web sources use explicitly provided access. Checking formal consistency, preparing a submission, approving it and sending it remain different activities and authorities.

### Communicating with customers

Product knowledge, communication rules and authorized customer context support a service agent. Repeated questions can produce tasks to improve documentation or a confusing product interaction, not merely more replies. Drafting and sending are distinct because sending has an external effect. Learning can improve instructions without silently expanding authority.

## 12. Scope, evaluation and the long-term vision

### Principles and the concrete product

This whitepaper is a conceptual reference, not a feature checklist or a statement that every described behavior is implemented. The linked [specification set](_main.md) describes the concrete product contract. Internal/external storage is an axis of the framework; external project context is part of the reference design, while external task trackers, agent stores and mixed local/remote agent teams remain longer-term directions.

The framework does not require all external resources to become local files, and the product's Git discipline does not make external actions transactional. Maintaining explicit relationships and permissions is essential whenever context crosses that boundary.

### How to assess progress

Completed-task count alone is not enough. Assess useful accepted work, intervention frequency and reasons, time and cost per verified result, failures, reversals and progress toward the agenda's actual goal. Reducing human involvement at the expense of hidden errors is not progress. These are evaluation criteria, not published benchmark results.

### A project that maintains continuity

The long-term direction is an agenda with purpose, durable context and the means to recognize and perform work without constant human assignment. It may develop a product, manage communication, observe operations and coordinate other responsibilities. Full autonomy across technical, commercial and professional domains is not claimed as a universally achieved state.

**Promptbook aims to move people from continuously assigning subtasks to owning intent, rules and responsibility.** Agents carry purpose, the project carries context, and tasks connect that purpose to verifiable changes.

## Sources and technical foundations

The conception is Pavol Hejný's. These sources support the referenced Git and project-instruction principles, not the implementation status of Promptbook.

[1] Git / Pro Git. *What is Git?*  
https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F

[2] Git. *git-commit — Record changes to the repository.*  
https://git-scm.com/docs/git-commit

[3] Git. *git-revert — Revert some existing commits.*  
https://git-scm.com/docs/git-revert

[4] AGENTS.md. *An open format for coding-agent instructions.*  
https://agents.md/

[5] OpenGitOps. *GitOps Principles, v1.0.0.*  
https://opengitops.dev/
