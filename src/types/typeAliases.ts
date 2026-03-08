/*
.--------------------------------------------------.
| These string_whatever are just semantic helpers |
'--------------------------------------------------'
*/

export type {
    InputParameters,
    Parameters,
    ReservedParameters,
    string_agent_hash,
    string_agent_name,
    string_agent_name_in_book,
    string_agent_permanent_id,
    string_business_category_name,
    string_char,
    string_chat_prompt,
    string_completion_prompt,
    string_model_description,
    string_model_name,
    string_name,
    string_page,
    string_parameter_name,
    string_parameter_value,
    string_persona_description,
    string_prompt,
    string_prompt_image,
    string_reserved_parameter_name,
    string_system_message,
    string_template,
    string_text_prompt,
    string_title,
} from './string_parameter_name';

export type {
    string_base_58,
    string_file_extension,
    string_semantic_version,
    string_sha256,
    string_uuid,
    string_version_dependency,
} from './string_sha256';

export type {
    string_css,
    string_css_class,
    string_css_property,
    string_css_selector,
    string_css_value,
    string_fonts,
    string_html,
    string_javascript,
    string_json,
    string_markdown,
    string_markdown_codeblock_language,
    string_markdown_section,
    string_markdown_section_content,
    string_markdown_text,
    string_promptbook_documentation_url,
    string_script,
    string_svg,
    string_typescript,
    string_xml,
} from './string_markdown';

export type {
    string_absolute_dirname,
    string_absolute_filename,
    string_dirname,
    string_executable_path,
    string_filename,
    string_relative_dirname,
    string_relative_filename,
} from './string_filename';

export type {
    string_base64,
    string_base_url,
    string_data_url,
    string_domain,
    string_email,
    string_emails,
    string_host,
    string_hostname,
    string_href,
    string_ip_address,
    string_mime_type,
    string_mime_type_with_wildcard,
    string_origin,
    string_pipeline_root_url,
    string_pipeline_url,
    string_pipeline_url_with_task_hash,
    string_promptbook_server_url,
    string_protocol,
    string_tdl,
    string_uri,
    string_uri_part,
    string_url,
    string_url_image,
    string_agent_url,
} from './string_url';

export type { string_knowledge_source_content, string_knowledge_source_link } from './string_knowledge_source_content';

export type {
    string_attribute,
    string_attribute_value_scope,
    string_color,
    string_javascript_name,
    string_legal_entity,
    string_license,
    string_person_firstname,
    string_person_fullname,
    string_person_lastname,
    string_person_profile,
    string_postprocessing_function_name,
    string_translate_language,
    string_translate_name,
    string_translate_name_not_normalized,
} from './string_person_fullname';

export type {
    id,
    string_app_id,
    string_date_iso8601,
    string_language,
    string_license_token,
    string_password,
    string_pgp_key,
    string_promptbook_token,
    string_ssh_key,
    string_token,
    string_user_id,
    task_id,
} from './string_token';

export type {
    number_bytes,
    number_days,
    number_gigabytes,
    number_hours,
    number_id,
    number_integer,
    number_kilobytes,
    number_likeness,
    number_linecol_number,
    number_megabytes,
    number_milliseconds,
    number_minutes,
    number_model_temperature,
    number_months,
    number_negative,
    number_percent,
    number_port,
    number_positive,
    number_seconds,
    number_seed,
    number_terabytes,
    number_tokens,
    number_usd,
    number_weeks,
    number_years,
} from './number_usd';

/**
 * TODO: [main] !!3 Change "For example" to @example
 * TODO: Change to branded types
 * TODO: Delete type aliases that are not exported or used internally
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
