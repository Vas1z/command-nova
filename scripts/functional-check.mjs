import { chromium } from 'playwright-core'
import { mkdir, readFile } from 'node:fs/promises'

const chrome =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const baseUrl = process.env.COMMAND_NOVA_URL ?? 'http://127.0.0.1:4173/'
const results = []
await mkdir('artifacts', { recursive: true })

function check(name, condition, details = '') {
  results.push({ name, ok: Boolean(condition), details })
  if (!condition) throw new Error(`FAILED: ${name}${details ? ` — ${details}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--hide-scrollbars', '--no-proxy-server'],
})
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'light',
  acceptDownloads: true,
})
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(error.message))

async function savedSettings() {
  await page.waitForTimeout(650)
  return page.evaluate(() => {
    const raw = localStorage.getItem('commandnova.settings.v1')
    return raw ? JSON.parse(raw) : null
  })
}

async function setRange(label, value) {
  await page.locator(`input[aria-label="${label}"]`).evaluate((element, next) => {
    const input = element
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    setter?.call(input, String(next))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
  await page.waitForTimeout(600)
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)

  check('9 default sites', (await page.locator('.site-tile-shell').count()) === 9)
  check(
    'brand renamed to Command Nova',
    (await page.title()) === 'Command Nova' &&
      (await page.locator('.brand__name').textContent()) === 'command nova',
  )
  check(
    'developer workspace layout is always active',
    (await page.locator('.main').evaluate((element) => getComputedStyle(element).display)) ===
      'grid',
  )
  check('no wallpaper layer is rendered', (await page.locator('.wallpaper').count()) === 0)
  check(
    'compact domains are visible',
    (await page
      .locator('.site-domain')
      .first()
      .evaluate((element) => getComputedStyle(element).display)) === 'block',
  )
  check(
    'site icons avoid expensive live backdrop blur',
    (await page
      .locator('.site-icon')
      .first()
      .evaluate((element) => getComputedStyle(element).backdropFilter)) === 'none',
  )

  check(
    'search is focused with Ctrl+K',
    await (async () => {
      await page.keyboard.press('Control+k')
      return page.evaluate(() => document.activeElement?.classList.contains('search__input'))
    })(),
  )

  await page.route('https://www.google.com/search**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Search OK</title>' }),
  )
  await page.locator('.search__input').fill('command nova')
  await page.locator('.search__input').press('Enter')
  await page.waitForURL(/google\.com\/search/)
  check('Google search URL', page.url().includes('q=command%20nova'), page.url())
  await page.goBack({ waitUntil: 'networkidle' })
  await page.waitForSelector('.app')
  await page.waitForTimeout(900)

  // Drag the first tile to the third slot with a real pointer path.
  const beforeDrag = await savedSettings()
  const firstShell = page.locator('.site-tile-shell').first()
  await firstShell.hover()
  await page.waitForTimeout(200)
  const handle = firstShell.locator('.tile-handle')
  const target = page.locator('.site-tile-shell').nth(2)
  const handleBox = await handle.boundingBox()
  const targetBox = await target.boundingBox()
  if (!handleBox || !targetBox) throw new Error('Could not measure drag handles')
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 12,
    handleBox.y + handleBox.height / 2 + 5,
    { steps: 4 },
  )
  await page.waitForTimeout(250)
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 20,
  })
  await page.waitForTimeout(300)
  await page.mouse.up()
  await page.waitForTimeout(600)

  const reordered = await savedSettings()
  const reorderedIds = reordered.sites.map((site) => site.id)
  const beforeIds = beforeDrag.sites.map((site) => site.id)
  check(
    'drag-and-drop reorder persisted',
    reorderedIds.length === beforeIds.length &&
      reorderedIds.join('|') !== beforeIds.join('|') &&
      reorderedIds.indexOf('default-google') !== 0,
    JSON.stringify(reorderedIds),
  )
  check(
    'drag lands in the intended slot, not a row below',
    reorderedIds[2] === 'default-google',
    JSON.stringify(reorderedIds),
  )

  await page.getByRole('button', { name: 'Открыть настройки' }).click()
  await page.waitForTimeout(500)
  check('settings panel opens', await page.getByRole('dialog', { name: 'Настройки' }).isVisible())
  check(
    'Apple Minimal style picker is gone',
    (await page.getByText('Стиль интерфейса').count()) === 0,
  )
  check('wallpaper controls are gone', (await page.getByText('Обои', { exact: true }).count()) === 0)
  check(
    'glass controls are gone',
    (await page.getByText('Стекло и фокус').count()) === 0,
  )

  await page.getByRole('button', { name: 'Тёмная', exact: true }).click()
  await page.waitForTimeout(300)
  check(
    'dark theme applied',
    (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark',
  )

  await setRange('Колонок на компьютере', 4)
  check(
    'grid column setting works',
    (await page
      .locator('.site-grid')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--grid-columns').trim())) === '4',
  )

  await page.getByRole('switch', { name: 'Открывать сайты в новой вкладке' }).click()
  await page.waitForTimeout(300)
  check(
    'open-in-new-tab target applied',
    (await page.locator('.site-tile').first().getAttribute('target')) === '_blank',
  )

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Экспорт', exact: true }).click(),
  ])
  const downloadPath = await download.path()
  check('settings export downloads JSON', Boolean(downloadPath))
  const exported = JSON.parse(await readFile(downloadPath, 'utf8'))
  check(
    'export contains site and layout settings',
    exported.app === 'commandnova' &&
      exported.settings.sites.length === 9 &&
      exported.settings.columns === 4,
  )
  check(
    'removed wallpaper fields are not exported',
    !('wallpaper' in exported.settings) && !('design' in exported.settings),
  )

  await page.getByRole('button', { name: 'Светлая', exact: true }).click()
  await page.waitForTimeout(300)
  await page
    .locator('.settings-panel input[type="file"][accept="application/json,.json"]')
    .setInputFiles(downloadPath)
  await page.waitForTimeout(900)
  check(
    'settings import restores theme',
    (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark',
  )

  await page.getByRole('button', { name: 'Сбросить настройки' }).click()
  await page.locator('.reset-confirm .button--danger').click()
  await page.waitForTimeout(700)
  check('reset restores 9 sites', (await page.locator('.site-tile-shell').count()) === 9)
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  await page.waitForTimeout(400)

  // Add → edit → delete → undo.
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()
  await page.getByLabel('Адрес', { exact: true }).fill('developer.mozilla.org')
  await page.getByLabel('Название', { exact: true }).fill('MDN')
  await page.getByRole('dialog').getByRole('button', { name: 'Добавить', exact: true }).click()
  await page.waitForTimeout(600)
  check(
    'site added',
    (await page.locator('.site-title').filter({ hasText: /^MDN$/ }).count()) === 1,
  )

  const mdnShell = page.locator('.site-tile-shell').filter({ hasText: 'MDN' })
  await mdnShell.hover()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Действия с «MDN»' }).click()
  await page.getByRole('menuitem', { name: 'Изменить' }).click()
  await page.getByLabel('Название', { exact: true }).fill('MDN Docs')
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
  await page.waitForTimeout(900)
  const editedCount = await page
    .locator('.site-title')
    .filter({ hasText: /^MDN Docs$/ })
    .count()
  check('site edited', editedCount === 1, `count=${editedCount}`)

  const docsShell = page.locator('.site-tile-shell').filter({ hasText: 'MDN Docs' })
  await docsShell.hover()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Действия с «MDN Docs»' }).click()
  await page.getByRole('menuitem', { name: 'Удалить' }).click()
  await page.waitForTimeout(700)
  check(
    'site deleted',
    (await page.locator('.site-title').filter({ hasText: /^MDN Docs$/ }).count()) === 0,
  )
  await page.getByRole('button', { name: 'Вернуть' }).click()
  await page.waitForTimeout(700)
  check(
    'delete undo works',
    (await page.locator('.site-title').filter({ hasText: /^MDN Docs$/ }).count()) === 1,
  )

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  check(
    'settings survive reload',
    (await page.locator('.site-title').filter({ hasText: /^MDN Docs$/ }).count()) === 1,
  )

  // Mobile layout sanity.
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
  })
  const mobile = await mobileContext.newPage()
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' })
  await mobile.waitForTimeout(700)
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  check('mobile has no horizontal overflow', !overflow)
  const addPosition = await mobile.locator('.add-tile').boundingBox()
  const firstPosition = await mobile.locator('.site-tile-shell').first().boundingBox()
  check(
    'orphan add tile is centered on mobile',
    Boolean(addPosition && firstPosition && addPosition.x > firstPosition.x + 50),
    JSON.stringify({ addPosition, firstPosition }),
  )
  await mobile.screenshot({ path: 'artifacts/mobile-functional.png' })
  await mobileContext.close()

  check('no page errors', pageErrors.length === 0, pageErrors.join('; '))

  console.log(JSON.stringify({ passed: results.length, results, pageErrors }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ passed: results.length, results, pageErrors }, null, 2))
  throw error
} finally {
  await browser.close()
}
