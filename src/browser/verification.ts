/**
 * Guidance returned with a website verification obstacle in both browser and Wallet tools.
 *
 * @private project browser
 */
export const CAPTCHA_GUIDANCE =
    'If a CAPTCHA blocks this step, leave the challenge in place. For public research, open an independent source such as the original publisher. For a required service, use an official integration already authorized for the same account and operation, if available. Verify the requested outcome. If the requirement still cannot be met, report exactly what is blocked and continue independent work. Do not ask the user to solve the challenge.';

/**
 * Checks the current document for a visible, pending verification widget. The browser returns only the boolean.
 *
 * @private browser page scripts
 */
export const PENDING_CAPTCHA_SCRIPT = `(() => {
    const widgets = document.querySelectorAll('.g-recaptcha, .h-captcha, .cf-turnstile, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare.com"]');
    const visible = Array.from(widgets).some((element) => {
        const box = element.getBoundingClientRect();
        return box.width >= 150 && box.height >= 64 && getComputedStyle(element).visibility === 'visible' &&
            !element.closest('.grecaptcha-badge') && element.getAttribute('data-size') !== 'invisible' && !/size=invisible/.test(element.getAttribute('src') || '');
    });
    if (!visible) return false;
    const responses = document.querySelectorAll('[name="g-recaptcha-response"], [name="h-captcha-response"], [name="cf-turnstile-response"]');
    return responses.length === 0 || Array.from(responses).some((element) => !element.value);
})()`;
