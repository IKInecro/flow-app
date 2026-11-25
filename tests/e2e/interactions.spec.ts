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
  // A longer program keeps the run alive while the test reaches Pause.
  await page.getByRole('button', { name: /open example bubble sort/i }).click()
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

test('panels hide, resize, and remember the workspace', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/examples')
  await page.getByRole('button', { name: /open example hello world/i }).click()
  await page.waitForSelector('.react-flow__node')

  const canvasWidth = async (): Promise<number> => {
    const box = await page.locator('.canvas').boundingBox()
    if (!box) throw new Error('canvas missing')
    return Math.round(box.width)
  }

  const wide = await canvasWidth()
  await page.getByLabel('Hide shapes panel').click()
  await expect(page.locator('.palette')).toHaveCount(0)
  expect(await canvasWidth()).toBeGreaterThan(wide)
  await page.getByLabel('Show shapes panel').click()
  await expect(page.locator('.palette')).toBeVisible()

  await page.getByLabel('Hide right panel').click()
  await expect(page.locator('.editor__side')).toHaveCount(0)
  await page.getByLabel('Show right panel').click()
  await expect(page.locator('.editor__side')).toBeVisible()

  const divider = page.getByRole('separator', { name: 'Resize shapes panel' })
  await divider.focus()
  await divider.press('ArrowRight')
  await divider.press('ArrowRight')
  await expect(divider).toHaveAttribute('aria-valuenow', '220')

  await page.getByLabel('Collapse sidebar').click()
  await expect(page.locator('.rail')).toHaveCSS('width', '78px')

  await page.reload()
  await page.waitForSelector('.react-flow__node')
  await expect(page.locator('.rail')).toHaveCSS('width', '78px')
  await expect(page.getByRole('separator', { name: 'Resize shapes panel' })).toHaveAttribute(
    'aria-valuenow',
    '220',
  )
})

test('block properties float beside the node and the terminal appears on run', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/examples')
  await page.getByRole('button', { name: /open example hello world/i }).click()
  await page.waitForSelector('.react-flow__node')

  const node = page.locator('.flow-node[data-kind=output]')
  await node.click()

  const card = page.getByRole('dialog', { name: 'Block properties' })
  await expect(card).toBeVisible()
  const nodeBox = await node.boundingBox()
  const cardBox = await card.boundingBox()
  if (!nodeBox || !cardBox) throw new Error('missing geometry')
  const beside = cardBox.x > nodeBox.x + nodeBox.width || cardBox.x + cardBox.width < nodeBox.x
  expect(beside).toBe(true)

  await card.getByLabel(/expression/i).fill('"Hi, Marco"')
  await card.getByLabel(/expression/i).press('Enter')
  await expect(node.locator('.flow-node__label')).toHaveText('Output "Hi, Marco"')

  await page.getByRole('button', { name: 'Close block properties' }).click()
  await expect(card).toHaveCount(0)
  await page.getByRole('button', { name: 'Edit node' }).click()
  await expect(card).toBeVisible()
  await expect(card.getByLabel(/expression/i)).toBeFocused()

  await page.getByRole('button', { name: /^run$/i }).click()
  const terminal = page.getByRole('region', { name: 'Console' })
  await expect(terminal).toBeVisible()
  const box = await terminal.boundingBox()
  if (!box) throw new Error('terminal missing')
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(1440)
  expect(box.y + box.height).toBeLessThanOrEqual(900)
  await expect(page.locator('.console-entry--output').first()).toContainText('Hi, Marco')
})

test('sidebar follows the theme and its navigation can be folded', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('marcoflow.theme', 'light'))
  await page.reload()
  const light = await page.locator('.rail').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(light).toBe('rgb(255, 255, 255)')

  await page.evaluate(() => localStorage.setItem('marcoflow.theme', 'dark'))
  await page.reload()
  const dark = await page.locator('.rail').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(dark).not.toBe(light)

  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  await expect(page.getByRole('link', { name: 'Projects' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('link', { name: 'Projects' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Expand navigation' }).click()
  await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible()
})
