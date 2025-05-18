import { AronaNode } from "./node"

export class AronaTextNode extends AronaNode {
  #textContent: string = ""

  constructor(textContent: string) {
    super("arona:__text")
    this.#textContent = textContent
  }

  setTextContent(textContent: string) {
    this.#textContent = textContent
  }

  get innerText(): string {
    return this.#textContent
  }
}

export const isTextNode = (node?: AronaNode | null): node is AronaTextNode => {
  return node?.type === "arona:__text"
}
