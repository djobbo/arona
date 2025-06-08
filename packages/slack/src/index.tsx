import { useState } from "react"
import { SlackClient } from "./client"
import { Actions, Button, Divider } from "./components"
import { renderMessage } from "./render"

// Initialize your app with your bot token and app token
const app = new SlackClient({
	token: process.env.SLACK_BOT_TOKEN, // xoxb- token
	appToken: process.env.SLACK_APP_TOKEN, // xapp- token
	socketMode: true,
	port: Number(process.env.SLACK_PORT) || 3000,
})

app.message(/hi/i, async ({ message }) => {
	renderMessage(message, () => {
		const [count, setCount] = useState(0)
		return (
			<>
				<Button>{count}</Button>
				<Divider />
				<Actions>
					<Button
						style="danger"
						onClick={() => {
							setCount(count - 1)
						}}
					>
						-1
					</Button>
					<Button
						style="primary"
						onClick={() => {
							setCount(count + 1)
						}}
					>
						+1
					</Button>
				</Actions>
			</>
		)
	})
})

// Error handling
app.error((error) => {
	console.error("Slack app error:", error)
})

try {
	await app.start()
	console.log("⚡️ Slack bot is running with Socket Mode!")
} catch (error) {
	console.error("Failed to start the app:", error)
}
