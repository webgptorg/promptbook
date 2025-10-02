/**
 * (Removed)
 *
 * Central LLM provider profiles registry has been refactored away.
 * Each LLM provider now defines its own `profile` object colocated with its implementation.
 *
 * Original exports:
 *   - LLM_PROVIDER_PROFILES
 *   - getLlmProviderProfile
 *   - createCustomLlmProfile
 *
 * This file intentionally left without any runtime exports to surface any stale imports during build/tests.
 * Remove any remaining imports referencing this path.
 */
