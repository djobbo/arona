import { chromium, webkit } from "playwright-core"
import { renderToString } from "react-dom/server"
import type {
  Browser,
  LaunchOptions,
  Page,
  PageScreenshotOptions,
} from "playwright-core"
import type { ReactElement } from "react"

const browsers = {
  chromium,
  webkit,
} as const

type Viewport = {
  width: number
  height: number
}

export type RenderContext = {
  browser: Browser
  page: Page
}

export type RenderOptions = {
  viewport?: Viewport
  screenshotOptions?: PageScreenshotOptions
  beforeRender?: (context: RenderContext) => Promise<void>
  beforeScreenshot?: (context: RenderContext) => Promise<void>
  browserOptions?: LaunchOptions
  browserType?: "chromium" | "webkit" // "firefox" screenshots are not yet supported in playwright-core
  pageOptions?: Record<string, any> // playwright doesn't export types for this yet
}

export const renderToImageBuffer = async (
  Element: (props: RenderContext) => ReactElement,
  {
    viewport,
    screenshotOptions,
    beforeRender,
    beforeScreenshot,
    browserOptions,
    browserType = "chromium",
    pageOptions,
  }: RenderOptions = {},
) => {
  const browserBase = browsers[browserType]
  const browser = await browserBase.launch({
    headless: true,
    ...browserOptions,
  })

  const page = await browser.newPage({ viewport, ...pageOptions })

  await beforeRender?.({ browser, page })

  const html = renderToString(<Element page={page} browser={browser} />)
  await page.setContent(html)

  await beforeScreenshot?.({ browser, page })

  const imageBuffer = await page.screenshot(screenshotOptions)

  await browser.close()

  return imageBuffer
}

export const renderToBase64 = async (
  Element: (props: RenderContext) => ReactElement,
  options: RenderOptions = {},
) => {
  const imageBuffer = await renderToImageBuffer(Element, options)
  return imageBuffer.toString("base64")
}

export const renderToBase64String = async (
  Element: (props: RenderContext) => ReactElement,
  options: RenderOptions = {},
) => {
  const base64Img = await renderToBase64(Element, options)
  return `data:image/${
    options.screenshotOptions?.type ?? "png"
  };base64,${base64Img}`
}
