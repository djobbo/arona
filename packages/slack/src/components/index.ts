export * from "./types"

import { buttonComponent } from "./elements/button"
export * from "./elements/button"
export const Button = buttonComponent.component

import { actionsComponent } from "./blocks/actions"
export * from "./blocks/actions"
export const Actions = actionsComponent.component

import { dividerComponent } from "./blocks/divider"
export * from "./blocks/divider"
export const Divider = dividerComponent.component

import { textComponent } from "./elements/text"
export * from "./elements/text"
export const Text = textComponent.component

import { markdownComponent } from "./elements/text"
export * from "./elements/text"
export const Markdown = markdownComponent.component

export * from "./elements/section"
