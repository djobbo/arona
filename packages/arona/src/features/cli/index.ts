import { dev } from "./dev"
import path from "node:path"

const myPath = path.resolve(__dirname, "../../index.ts")
dev(myPath)
