import { AttachmentBuilder, ButtonStyle, GatewayIntentBits } from "discord.js"
import { Button, Embed, createClient, createSlashCommand } from "reaccord"
import { CanvasImage, renderToImageBuffer } from "@reaccord/canvas"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { config as loadEnv } from "dotenv"
import { useState } from "react"
import type { User } from "discord.js"

loadEnv()

const { DISCORD_TOKEN, DISCORD_DEV_GUILD_ID, DISCORD_CLIENT_ID } = process.env

export const CounterApp = ({
  start = 0,
  user,
}: {
  start?: number
  user: User
}) => {
  const [count, setCount] = useState(start)
  const increment = () => setCount((count) => count + 1)

  return (
    <>
      <CanvasImage id={["user-welcome", user.username]} width={240} height={40}>
        <script src="https://cdn.tailwindcss.com"></script>
        <div className="flex w-full h-full justify-center align-center">
          <h1 className="text-orange-600 text-2xl pb-1">
            Hello {user.username}!
          </h1>
        </div>
      </CanvasImage>
      <Embed>
        <CanvasImage
          id={["my-canvas-thumb", count]}
          as={Embed.Thumbnail}
          width={60}
          height={60}
          placeholderUrl="https://via.placeholder.com/60x60"
        >
          <script src="https://cdn.tailwindcss.com"></script>
          <div className="flex w-full h-full justify-center align-center bg-slate-200">
            <h1 className="text-slate-700 font-bold text-4xl p-4">{count}</h1>
          </div>
        </CanvasImage>
      </Embed>
      <Button onClick={increment} style={ButtonStyle.Primary}>
        +
      </Button>
    </>
  )
}

const queryClient = new QueryClient()

const counterCommand = createSlashCommand("counter", "Counter app")
  .intParam("start", "Start count")
  .render(({ start }, interaction) => (
    <QueryClientProvider client={queryClient}>
      <CounterApp start={start} user={interaction.user} />
    </QueryClientProvider>
  ))

const imageGenCommand = createSlashCommand("hello", "Generate image with react")
  .stringParam("message", "Message to display")
  .exec(async ({ message }, interaction) => {
    const imageBuffer = await renderToImageBuffer(
      () => (
        <>
          <html>
            <head>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body className="p-2">
              <div
                className="w-full h-full bg-slate-200 rounded-lg shadow-md px-20 py-12"
                style={{
                  backgroundImage: `url("https://wallpaper.dog/large/20364175.jpg")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="bg-slate-100 w-full h-full flex justify-center items-center flex-col rounded-lg  shadow-md">
                  <h1 className="text-slate-700 font-bold text-3xl pb-1">
                    Hello {interaction.user.username}!
                  </h1>
                  <p className="text-blue-700">{message ?? "reaccord"}</p>
                </div>
              </div>
            </body>
          </html>
        </>
      ),
      {
        viewport: {
          width: 480,
          height: 240,
        },
      },
    )

    const imageAttachment = new AttachmentBuilder(imageBuffer)

    interaction.reply({
      files: [imageAttachment],
    })
  })

const client = createClient({
  token: DISCORD_TOKEN ?? "",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  devGuildId: DISCORD_DEV_GUILD_ID,
  clientId: DISCORD_CLIENT_ID,
})

client.registerCommands([imageGenCommand, counterCommand])

client.connect(() =>
  console.log(`🚀 Client connected as ${client.user?.username}!`),
)
