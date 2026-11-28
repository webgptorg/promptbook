# Chat Viewport Height QA

-   iOS Safari, portrait, address bar visible:
    Open `/agents/[agentName]/chat` on an iPhone with a home indicator. Confirm the composer sits flush to the bottom safe area and no white strip appears below it.
-   iOS Safari, portrait, address bar hidden:
    Scroll so Safari collapses the address bar. Confirm the message list expands to use the reclaimed space without leaving unused whitespace below the composer.
-   iOS Safari, orientation change:
    Rotate between portrait and landscape. Confirm the chat resizes cleanly, the composer stays pinned, and the transcript remains the only scrolling region.
-   Android Chrome, address bar visible and hidden:
    Repeat the same checks while toggling the top browser chrome by scrolling. Confirm there is no bottom gap after each transition.
-   Desktop browser resize:
    Resize the window from tall to short and back. Confirm the chat surface continuously fills the viewport and the composer remains pinned without extra page scroll.
