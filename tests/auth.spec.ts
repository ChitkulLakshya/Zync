import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the welcome and login page', async ({ page }) => {
    // Navigate directly to login and wait for the page to be ready
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 20000 });

    // Test that the form elements are present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
  });
});
