import { AronaNode } from "./node"

export class AronaTextNode extends AronaNode {
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
