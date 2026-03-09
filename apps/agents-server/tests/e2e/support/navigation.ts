import { expect, type Page } from 'playwright/test';

/**
 * Opens a top-level header dropdown menu by its visible label.
 *
 * @param page - Current Playwright page.
 * @param menuLabel - Visible menu label shown in the header.
 */
export async function openHeaderMenu(page: Page, menuLabel: string): Promise<void> {
    const menuButton = page.getByRole('button', { name: menuLabel });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
}
