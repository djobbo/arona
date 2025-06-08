import { actionsComponent } from "../blocks/actions"
import { dividerComponent } from "../blocks/divider"
import { buttonWithActionBlockComponent } from "../elements/button"
import { sectionComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING } from "../elements/section"
import {
	markdownWithSectionComponent,
	textWithSectionComponent,
} from "../elements/text"

export const topLevelComponents = [
	// Blocks
	dividerComponent,
	actionsComponent,
	sectionComponent_DO_NOT_USE_UNLESS_YOU_KNOW_WHAT_YOU_ARE_DOING,

	// Elements with default block
	buttonWithActionBlockComponent,
	textWithSectionComponent,
	markdownWithSectionComponent,
]
