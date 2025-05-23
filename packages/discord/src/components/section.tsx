import { type AronaNode, defineComponent } from "@arona/core"
import {
	SectionBuilder,
	type SectionComponentData,
	TextDisplayBuilder,
} from "discord.js"
import type { ReactNode } from "react"
import { EMPTY_STRING } from "../constants"
import { buttonComponent } from "./button"
import { textComponent } from "./text"
import { thumbnailComponent } from "./thumbnail"
import type { AronaDiscordProps } from "./types"

interface SectionAccessoryInternalProps {
	children?: ReactNode
}

/**
 * @deprecated This is an internal component and should not be used outside of the library.
 */
export const sectionAccessoryComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING =
	defineComponent({
		name: "arona:section-accessory",
		allowedChildren: [buttonComponent, thumbnailComponent],
		render:
			(renderChildren) => (node: AronaNode<SectionAccessoryInternalProps>) => {
				const content = renderChildren(node.children)
				return {
					components: content.map(({ components }) => components).flat(),
					listenerEntries: content.flatMap(
						({ listenerEntries }) => listenerEntries,
					),
				}
			},
	})

/**
 * @deprecated This is an internal type and should not be used outside of the library.
 */
export interface SectionInternalProps_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING
	extends Omit<
		AronaDiscordProps<SectionComponentData>,
		"components" | "accessory"
	> {
	children?: ReactNode
}

/**
 * @deprecated This is an internal component and should not be used outside of the library.
 */
export const sectionComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING =
	defineComponent({
		name: "arona:section",
		// We don't allow accessory components as children, because they are passed as a prop
		allowedChildren: [textComponent],
		render:
			(renderChildren) =>
			(
				node: AronaNode<SectionInternalProps_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING>,
			) => {
				const contentNodes = node.children.filter(
					(child) =>
						!sectionAccessoryComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING.guard(
							child,
						),
				)
				const accessoryNodes = node.children.filter(
					sectionAccessoryComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING.guard,
				)

				if (accessoryNodes.length > 1) {
					throw new Error(
						`Only one accessory is allowed in a section, found ${accessoryNodes.length}`,
					)
				}

				const accessoryNode = accessoryNodes[0]

				// TODO: If there's no accessory, maybe fallback to just the text elements and remove the sections completly
				if (!accessoryNode) {
					throw new Error("No accessory found in section")
				}

				const content = renderChildren(contentNodes)
				const textDisplayComponents = content.flatMap(
					({ components }) => components,
				)
				const accessory =
					sectionAccessoryComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING.render(
						accessoryNode,
					)
				const isEmptySection = textDisplayComponents.length === 0

				const accesoryComponent = accessory.components[0]
				// TODO: If there's no accessory, maybe fallback to just the text elements and remove the sections completly
				if (!accesoryComponent) {
					throw new Error("No accessory component found in section")
				}

				const section = new SectionBuilder({
					components: isEmptySection
						? [
								new TextDisplayBuilder({
									content: EMPTY_STRING,
								}).toJSON(),
							]
						: textDisplayComponents.map((component) => component),
					accessory: accesoryComponent.toJSON(),
				})

				return {
					components: [section.toJSON()],
					listenerEntries: accessory.listenerEntries,
				}
			},
	})

/**
 * @deprecated This is an internal type and should not be used outside of the library.
 */
export interface SectionProps_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING {
	children?: ReactNode
	accessory: ReactNode
}

export const Section = ({
	children,
	accessory,
	...props
}: SectionProps_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING) => {
	return (
		<sectionComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING.component
			{...props}
		>
			{children}
			<sectionAccessoryComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING.component>
				{accessory}
			</sectionAccessoryComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING.component>
		</sectionComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING.component>
	)
}
