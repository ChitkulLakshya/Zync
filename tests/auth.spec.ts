import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the welcome and login page', async ({ page }) => {
    // Navigate to root which should show the welcome screen or redirect
    await page.goto('/');
    
    // Check if we hit the welcome screen
    const isWelcome = await page.locator('text=Welcome to Zync').isVisible();
    if (isWelcome) {
      await expect(page.getByText('Welcome to Zync')).toBeVisible();
      // Click get started
      const getStarted = page.getByRole('button', { name: /get started/i });
      if (await getStarted.isVisible()) {
        await getStarted.click();
      }
    }
    
    // It should eventually take us to login or we can manually go there
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /login to zync/i })).toBeVisible({ timeout: 15000 });
    
    // Test that the form elements are present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
  });
});
