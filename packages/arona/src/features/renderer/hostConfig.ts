import { AronaNode } from "./nodes/node"
import { AronaTextNode } from "./nodes/text"
import type { AronaRootNode } from "./nodes/root"
import type { HostConfig } from "react-reconciler"

export const hostConfig: HostConfig<
  string,
  Record<string, unknown>,
  AronaNode,
  AronaNode,
  AronaTextNode,
  unknown,
  unknown,
  unknown,
  null,
  true,
  unknown,
  unknown,
  unknown
> = {
  getChildHostContext: () => null,
  prepareForCommit: () => null,
  resetAfterCommit(root: AronaRootNode) {
    root.render()
  },
  createInstance: (tag, attr) => new AronaNode(tag, attr),
  appendInitialChild: (parent, node) => {
    parent.insertBefore(node)
  },
  finalizeInitialChildren: () => false,
  prepareUpdate: () => true,
  shouldSetTextContent: () => false,
  createTextInstance: (textContent: string) => new AronaTextNode(textContent),
  commitMount() {},
  commitUpdate(node, _updatePayload, _tag, _oldAttr, attr) {
    node.replaceAttributes(attr)
  },
  resetTextContent() {},
  commitTextUpdate(textNode, _oldTextContent, textContent) {
    textNode.setTextContent(textContent)
  },
  appendChild(parent, node) {
    parent.insertBefore(node)
  },
  appendChildToContainer(parent, node) {
    parent.insertBefore(node)
  },
  insertBefore(parent, node, anchor?: AronaNode) {
    parent.insertBefore(node, anchor)
  },
  insertInContainerBefore(parent, node, anchor?: AronaNode) {
    parent.insertBefore(node, anchor)
  },
  removeChild(parent, node: AronaNode) {
    parent.removeChild(node)
  },
  removeChildFromContainer(parent, node: AronaNode) {
    parent.removeChild(node)
  },
  hideInstance() {},
  hideTextInstance() {},
  unhideInstance() {},
  unhideTextInstance() {},
  clearContainer(node: AronaNode) {
    node.clear()
  },
  getRootHostContext: () => null,
  supportsMutation: true,
  supportsPersistence: false,
  getPublicInstance() {},
  preparePortalMount() {},
  scheduleTimeout() {},
  cancelTimeout() {},
  noTimeout: true,
  isPrimaryRenderer: true,
  supportsHydration: false,
  getCurrentEventPriority: () => 99,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => null,
  afterActiveInstanceBlur: () => null,
  prepareScopeUpdate: () => null,
  getInstanceFromScope: () => null,
  detachDeletedInstance: () => null,
}
