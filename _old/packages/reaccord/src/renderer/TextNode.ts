import { ReaccordNode } from "./ReaccordNode"

export class TextNode extends ReaccordNode {
  #textContent: string = ""

  constructor(textContent: string) {
    super("reaccord:__text")
    this.#textContent = textContent
  }

  setTextContent(textContent: string) {
    this.#textContent = textContent
  }

  get innerText(): string {
    return this.#textContent
  }
}
