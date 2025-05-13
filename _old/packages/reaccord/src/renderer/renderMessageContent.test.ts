import { TextNode } from "./TextNode"
import { describe, expect, it } from "bun:test"
import { renderInnerText, renderText } from "./renderMessageContent"

describe("Render text elements", () => {
  it("should render a simple text element", () => {
    const textElement = new TextNode("Hello World")

    const text1 = renderText(textElement)
    expect(text1).toBe("Hello World")

    const text2 = renderInnerText(textElement)
    expect(text2).toBe("Hello World")

    textElement.setTextContent("Hi!")

    const text3 = renderText(textElement)
    expect(text3).toBe("Hi!")

    const text4 = renderInnerText(textElement)
    expect(text4).toBe("Hi!")
  })
})
