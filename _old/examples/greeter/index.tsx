import { Button, Embed, createClient, createSlashCommand } from "reaccord"
import { CanvasImage } from "@reaccord/canvas"
import { GatewayIntentBits } from "discord.js"
import { config as loadEnv } from "dotenv"

loadEnv()

const { DISCORD_TOKEN, DISCORD_DEV_GUILD_ID, DISCORD_CLIENT_ID } = process.env

const greetingCommand = createSlashCommand("greet", "Greet me!")
  .userParam("user", "User to greet")
  .render(({ user }, interaction) => {
    const userToGreet = user ?? interaction.user

    return (
      <>
        {userToGreet.toString()}, welcome!
        <Embed color="Orange">
          <Embed.Title>I am a bot designed to greet you!</Embed.Title>
          <CanvasImage
            id={["greeting", userToGreet.username]}
            width={320}
            height={80}
            placeholderUrl="https://via.placeholder.com/320x80"
            as={Embed.Image}
          >
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="bg-gray-800 w-screen h-screen flex justify-center items-center">
              <h1 className="text-lg font-bold text-white">
                Hello {userToGreet.username}!
              </h1>
            </div>
          </CanvasImage>
        </Embed>
        <Button
          onClick={() => {
            interaction.channel?.send("Hello!")
          }}
        >
          Say Hello!
        </Button>
      </>
    )
  })

const client = createClient({
  token: DISCORD_TOKEN ?? "",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  devGuildId: DISCORD_DEV_GUILD_ID,
  clientId: DISCORD_CLIENT_ID,
})

client.registerCommand(greetingCommand)

client.connect(() =>
  console.log(`🚀 Client connected as ${client.user?.username}!`),
)
