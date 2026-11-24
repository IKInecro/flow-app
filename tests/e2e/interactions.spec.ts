import { expect, test } from '@playwright/test'

test('a dragged node follows the pointer and keeps the offset on drop', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/examples')
  await page.getByRole('button', { name: /open example hello world/i }).click()
  await page.waitForSelector('.react-flow__node')

  const node = page.locator('.react-flow__node').filter({ hasText: 'Output' }).first()
  const start = await node.boundingBox()
  if (!start) throw new Error('node has no box')

  const x = start.x + start.width / 2
  const y = start.y + start.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()

  await page.mouse.move(x + 40, y + 12, { steps: 4 })
  const midway = await node.boundingBox()
  if (!midway) throw new Error('node lost during drag')
  expect(midway.x - start.x).toBeGreaterThan(28)
  expect(midway.y - start.y).toBeGreaterThan(4)

  await page.mouse.move(x + 90, y + 40, { steps: 6 })
  const moved = await node.boundingBox()
  if (!moved) throw new Error('node lost during drag')
  expect(moved.x - start.x).toBeGreaterThan(78)
  expect(moved.y - start.y).toBeGreaterThan(30)

  await page.mouse.up()
  const dropped = await node.boundingBox()
  if (!dropped) throw new Error('node missing after drop')
  expect(Math.abs(dropped.x - moved.x)).toBeLessThan(3)
  expect(Math.abs(dropped.y - moved.y)).toBeLessThan(3)
})

test('Stop is available while the program runs and pauses', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/examples')
  await page.getByRole('button', { name: /open example hello world/i }).click()
  await page.waitForSelector('.react-flow__node')

  await page.getByLabel('Run speed').selectOption('800')
  await page.getByRole('button', { name: /^run$/i }).click()

  const stop = page.getByRole('button', { name: /^stop$/i })
  await expect(stop).toBeVisible()
  await page.getByRole('button', { name: /^pause$/i }).click()
  await expect(page.locator('.run-pill__status')).toHaveText(/paused/i)
  await expect(stop).toBeVisible()

  await stop.click()
  await expect(page.locator('.run-pill__status')).toHaveText(/ready/i)
  await expect(stop).toBeHidden()
})
