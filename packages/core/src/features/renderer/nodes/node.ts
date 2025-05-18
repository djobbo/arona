import { v4 as uuidv4 } from "uuid"

export class AronaNode<Props = Record<string, unknown>> {
  uuid: string
  type: string
  children: AronaNode[] = []
  root: AronaNode | null = null
  parent: AronaNode | null = null

  props: Partial<Props>

  constructor(type: string, props?: Partial<Props>, root?: AronaNode) {
    this.uuid = uuidv4()
    this.type = type
    this.children = []
    this.props = props || {}
    this.root = root || null
  }

  setParent(node: AronaNode): void {
    this.parent = node
  }

  insertBefore(node: AronaNode, anchor?: AronaNode): void {
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

  get parentNode(): AronaNode {
    if (!this.parent) throw new TypeError(`Couldn't find parent of ${this}`)
    return this.parent
  }

  get firstChild(): AronaNode | undefined {
    return this.children[0]
  }

  get nextSibling(): AronaNode["children"][number] | undefined {
    const parent = this.parentNode
    if (!parent) throw new TypeError(`Couldn't find parent of ${this}`)

    const nodeIndex = parent.children.findIndex((child) => child === this)

    if (nodeIndex < 0) throw new TypeError(`Bad node ${this}`)

    return parent.children[nodeIndex + 1]
  }

  removeChild(node: AronaNode): void {
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
