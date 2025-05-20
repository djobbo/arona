#!/bin/env node

import path from "node:path"
import dotenv from "dotenv"
import { dev } from "./dev"

const [, , cmd, ...rest] = process.argv

// Load environment variables from .env file
dotenv.config({
	path: path.resolve(process.cwd(), ".env"),
})

switch (cmd) {
	case "dev": {
		const [entryPoint] = rest
		if (!entryPoint) {
			console.error("Please provide an entry point file path.")
			console.error("Usage: arona dev <entry-point>")
			process.exit(1)
		}
		const entry = path.resolve(process.cwd(), entryPoint)
		dev(entry)

		break
	}
	case undefined:
	case "help":
		console.log("Usage: arona <command> [options]")
		console.log("Commands:")
		console.log(
			"  dev <entry-point>   Start the development server with the specified entry point.",
		)
		process.exit(0)
	default:
		console.error(`Unknown command: ${cmd}`)
		console.error("Usage: arona dev <entry-point>")
		process.exit(1)
}
