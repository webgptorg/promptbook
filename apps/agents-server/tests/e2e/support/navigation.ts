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

/**
 * Opens a first-level submenu branch inside an already-open header dropdown.
 *
 * @param page - Current Playwright page.
 * @param branchLabel - Visible branch label shown in the dropdown.
 */
export async function openHeaderSubMenu(page: Page, branchLabel: string): Promise<void> {
    const branchButton = page.getByRole('button', { name: branchLabel });
    await expect(branchButton).toBeVisible();
    await branchButton.hover();
    await branchButton.click();
}
