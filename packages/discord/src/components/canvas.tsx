import { type ReactNode, useEffect, useState } from "react"
import satori, { type Font } from "satori"
import { type MediaProps, mediaComponent } from "./media-gallery"
import {Resvg} from "@resvg/resvg-js"

const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 400

export interface CanvasProps extends Omit<MediaProps, "media"> {
	children: ReactNode
	width?: number
	height?: number
	name?: string
	// TODO: Add possibility to add fonts directly in the discord client
	fonts?: Font[]
}

export const Canvas = ({ children, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, name, fonts = [] }: CanvasProps) => {
	const [imageBuffer, setImageBuffer] = useState<Buffer | null>(null)

	useEffect(() => {
		if (!children) return

		const render = async () => {
			const svg = await satori(children, {
				width,
				height,
				fonts
			})

			const png = new Resvg(svg, {
				fitTo: {
					mode: "width",
					value: width,
				},
				font: {
					loadSystemFonts: false,
				},
			})
				.render()
				.asPng()

			setImageBuffer(png)
		}
		render().catch(console.error)
	}, [children])

	if (!imageBuffer) return null

	return <mediaComponent.component file={imageBuffer} name={name} />
}
