import type { string_chat_prompt_private } from './string_chat_prompt_private';
import type { string_completion_prompt_private } from './string_completion_prompt_private';
import type { string_prompt_image_private } from './string_prompt_image_private';
import type { string_prompt_private } from './string_prompt_private';
import type { string_system_message_private } from './string_system_message_private';
import type { string_template_private } from './string_template_private';
import type { string_text_prompt_private } from './string_text_prompt_private';

/**
 * Semantic helper
 *
 * For example `"How many eyes does a cat have?"`
 */
export type string_prompt = string_prompt_private;

/**
 * Semantic helper
 *
 * For example `"A cat wearing a hat"`
 */
export type string_prompt_image = string_prompt_image_private;

/**
 * Semantic helper
 *
 * For example `"A cat wearing a {item}"`
 */
export type string_template = string_template_private;

/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 */
export type string_text_prompt = string_text_prompt_private;

/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 */
export type string_chat_prompt = string_chat_prompt_private;

/**
 * Semantic helper
 *
 * For example `"You are an AI assistant. You are here to help me with my work."`
 */
export type string_system_message = string_system_message_private;

/**
 * Semantic helper
 *
 * For example `"Following is a text about cats: Once upon a time there was a cat"`
 */
export type string_completion_prompt = string_completion_prompt_private;
