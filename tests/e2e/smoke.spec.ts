import { expect, test } from '@playwright/test'

test('create, run, step, export, and import a program', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByRole('button', { name: /proyek baru/i }).click()

  await expect(page.getByRole('button', { name: /tambah output/i })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /tambah output/i }).click()

  await page.locator('.flow-node').filter({ hasText: 'Output' }).first().click()
  await page.getByLabel(/ekspresi/i).fill('"Hello, world"')

  await page.getByRole('button', { name: /jalankan/i }).click()
  await expect(page.locator('.console-entry--output')).toContainText('Hello, world')

  await page.getByRole('button', { name: /langkah/i }).click()
  await expect(page.locator('.run-pill__status')).toHaveText(/jeda/i)

  const downloadPromise = page.waitForEvent('download')
  await page.getByLabel('Menu file').click()
  await page.getByRole('menuitem', { name: /ekspor .fprg/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.fprg$/)
  const saved = testInfo.outputPath('smoke.fprg')
  await download.saveAs(saved)

  await page.getByLabel('Menu file').click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: /impor .fprg/i }).click()
  const chooser = await chooserPromise
  await chooser.setFiles(saved)
  await expect(page.getByText(/proyek diimpor/i)).toBeVisible()
})
