# Source Citation Fix - Analysis & Implementation Plan

## Problem Statement

Agents are providing correct information based on given documents (from KNOWLEDGE commitments), but when users click on source citation chips in the chat UI, they see "Document preview unavailable" instead of the actual document.

## Root Cause Analysis

After deep analysis of the entire vertical stack from LLM responses to UI display, I've identified the issue:

### How Citations Should Work (Expected Flow)

1. **Agent Definition**: Agent source contains KNOWLEDGE commitments
   ```
   KNOWLEDGE https://pnbk.io/k/SS%202_2023%20-%20Informace%20106-fVolzkrfbVN3zuMCMEgb2ZeSxPPNs.docx
   ```

2. **LLM Response**: The LLM returns citations in the format `【5:13†SS%202_2023%20-%20Informace%20106-fVolzkrfbVN3zuMCMEgb2ZeSxPPNs.docx】`

3. **Citation Parsing**: `parseCitationsFromContent()` extracts:
   ```ts
   { id: "5:13", source: "SS%202_2023%20-%20Informace%20106-fVolzkrfbVN3zuMCMEgb2ZeSxPPNs.docx" }
   ```

4. **Citation Display**: UI shows SourceChip components for each citation

5. **URL Resolution**: When clicked, `resolveCitationUrl()` should:
   - Look in `agent.knowledgeSources[]` array to find matching filename
   - Return the URL for that knowledge source
   - Display the document in a modal

### What's Actually Happening (Bug)

The `knowledgeSources` array is **empty** in the frontend, even though:
- ✅ `parseAgentSource()` correctly extracts knowledge sources from KNOWLEDGE commitments
- ✅ `RemoteAgent` class has a `knowledgeSources` property to store them
- ✅ The `/api/profile` endpoint calls `parseAgentSource()` and gets the data
- ❌ **BUT** the profile API response doesn't include `knowledgeSources` in the JSON!

### The Bug Location

**File**: `apps/agents-server/src/app/agents/[agentName]/api/profile/route.ts`

**Line ~86-98**: The response is constructed but `knowledgeSources` is missing:

```ts
return new Response(
    JSON.stringify(
        {
            ...agentProfile,  // This spread includes knowledgeSources
            agentHash,
            parameters: [],
            isVoiceCallingEnabled,
            toolTitles: agentProfile.meta.toolTitles || {},
            // ❌ knowledgeSources is in agentProfile but may not be explicitly included
        },
        null,
        4,
    ),
    // ...
);
```

Actually, wait - the spread `...agentProfile` should include it. Let me check if there's another issue...

Actually, looking more carefully:
1. `agentProfile` is of type `AgentBasicInformation` which includes `knowledgeSources`
2. The spread `...agentProfile` should include it
3. BUT - after `inheritMeta()` is called, the returned object might not preserve all properties

Let me check the `inheritMeta` function more carefully - it only preserves certain properties (meta, personaDescription, initialMessage) but not knowledgeSources!

## The Fix

### Primary Fix: Ensure knowledgeSources is in API Response

**File**: `apps/agents-server/src/app/agents/[agentName]/api/profile/route.ts`

Explicitly include `knowledgeSources` in the response JSON to ensure it's always present:

```ts
return new Response(
    JSON.stringify(
        {
            ...agentProfile,
            agentHash,
            parameters: [],
            isVoiceCallingEnabled,
            toolTitles: agentProfile.meta.toolTitles || {},
            knowledgeSources: agentProfile.knowledgeSources || [], // ✅ Explicitly include
        },
        null,
        4,
    ),
    {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    },
);
```

### Secondary Fix: Inheritance Support (Future Enhancement)

The `inheritMeta()` function should also inherit `knowledgeSources` from parent agents:

```ts
// In inheritMeta function, after inheriting other properties:
if (!agentProfile.knowledgeSources || agentProfile.knowledgeSources.length === 0) {
    agentProfile.knowledgeSources = parentAgentProfile.knowledgeSources;
}
```

## Verification Steps

1. **Check Parse Function**: Verify `parseAgentSource()` correctly extracts knowledge sources ✅
2. **Check API Response**: Ensure `/api/profile` returns `knowledgeSources` array
3. **Check RemoteAgent**: Verify `RemoteAgent.connect()` stores the sources
4. **Check UI**: Verify `resolveCitationUrl()` can find URLs from the array
5. **End-to-End Test**: Click a citation chip and verify document preview shows

## Test Cases

### Test Case 1: Simple Knowledge URL
```
KNOWLEDGE https://example.com/document.pdf
```
Expected: Citation `【1†document.pdf】` resolves to `https://example.com/document.pdf`

### Test Case 2: URL with Query Parameters
```
KNOWLEDGE https://pnbk.io/k/file.docx?param=value
```
Expected: Citation resolves correctly ignoring query params for filename matching

### Test Case 3: Multiple Knowledge Sources
```
KNOWLEDGE https://example.com/doc1.pdf
KNOWLEDGE https://example.com/doc2.pdf
```
Expected: Both citations resolve to correct URLs

### Test Case 4: Inherited Knowledge (Future)
Agent A:
```
KNOWLEDGE https://example.com/doc.pdf
```

Agent B:
```
FROM Agent A
```
Expected: Agent B inherits knowledge sources from Agent A

## Implementation Checklist

- [ ] Fix `/api/profile` route to explicitly include `knowledgeSources`
- [ ] Test with existing agent that has KNOWLEDGE commitments
- [ ] Verify citation chips can be clicked and show documents
- [ ] Add inheritance support for `knowledgeSources` (optional enhancement)
- [ ] Update tests if needed
- [ ] Add entry to changelog

## Related Code Locations

### Core Logic
- `src/book-2.0/agent-source/parseAgentSource.ts` - Extracts knowledge sources (lines 239-254)
- `src/llm-providers/agent/RemoteAgent.ts` - Stores knowledge sources (line 116)
- `src/book-components/Chat/utils/resolveCitationUrl.ts` - Resolves URLs from sources

### Frontend
- `src/book-components/Chat/Chat/Chat.tsx` - Citation modal display (lines 715-786)
- `src/book-components/Chat/Chat/ChatMessageItem.tsx` - Source chip rendering
- `src/book-components/Chat/SourceChip/SourceChip.tsx` - Citation chip component

### Backend
- `apps/agents-server/src/app/agents/[agentName]/api/profile/route.ts` - **THE BUG IS HERE**

## Technical Debt & Future Improvements

1. **Type Safety**: Ensure `AgentBasicInformation` type is properly exported and used consistently
2. **Inheritance**: Make `inheritMeta` function more comprehensive to inherit all inheritable properties
3. **Documentation**: Add JSDoc comments explaining the citation flow
4. **Testing**: Add integration tests for citation resolution end-to-end

## Notes

- This is a data flow issue, not a parsing or UI rendering issue
- The fix is minimal and low-risk - just ensuring data flows through the API
- The existing code structure is good; it was just missing one piece in the data pipeline
- DRY principle is maintained - parsing logic is centralized in `parseAgentSource()`
