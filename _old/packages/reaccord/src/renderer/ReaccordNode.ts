import { v4 as uuidv4 } from "uuid"

export class ReaccordNode<Props = Record<string, unknown>> {
  uuid: string
  type: string
  children: ReaccordNode[] = []
  root: ReaccordNode | null = null
  parent: ReaccordNode | null = null

  props: Partial<Props>

  constructor(type: string, props?: Partial<Props>, root?: ReaccordNode) {
    this.uuid = uuidv4()
    this.type = type
    this.children = []
    this.props = props || {}
    this.root = root || null
  }

  setParent(node: ReaccordNode): void {
    this.parent = node
  }

  insertBefore(node: ReaccordNode, anchor?: ReaccordNode): void {
    if (!node) throw new Error("Wrong child type")
    if (anchor) {
      const anchorIndex = this.children.findIndex((child) => anchor === child)
      this.children.splice(anchorIndex, 0, node)
    } else {
      this.children.push(node)
    }

    node.setParent(this)
  }

  setAttribute(name: string, value: any): void {
    this.props[name as keyof Props] = value
  }

  replaceAttributes(attr: Record<string, any>): void {
    this.props = attr as Props
  }

  get parentNode(): ReaccordNode {
    if (!this.parent) throw new TypeError(`Couldn't find parent of ${this}`)
    return this.parent
  }

  get firstChild(): ReaccordNode | undefined {
    return this.children[0]
  }

  get nextSibling(): ReaccordNode["children"][number] | undefined {
    const parent = this.parentNode
    if (!parent) throw new TypeError(`Couldn't find parent of ${this}`)

    const nodeIndex = parent.children.findIndex((child) => child === this)

    if (nodeIndex < 0) throw new TypeError(`Bad node ${this}`)

    return parent.children[nodeIndex + 1]
  }

  removeChild(node: ReaccordNode): void {
    this.children = this.children.filter((child) => child !== node)
  }

  clear(): void {
    this.children.map((child) => child.clear())
    this.children = []
  }

  render() {
    this.root?.render()
  }
}
