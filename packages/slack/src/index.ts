import { App } from '@slack/bolt';

// Initialize your app with your bot token and app token
const app = new App({
  token: process.env.SLACK_BOT_TOKEN, // xoxb- token
  appToken: process.env.SLACK_APP_TOKEN, // xapp- token
  socketMode: true,
  port: Number(process.env.SLACK_PORT) || 3000
});

// Listen for messages that mention the bot or contain "hello"
app.message(/hello|hi|hey/i, async ({ message }) => {
  try {
    const msg = await app.client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: "Hello <@${message.user}>! 👋 I'm here to help you.",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hello <@${message.user}>! 👋 I'm here to help you.`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Get Started"
              },
              action_id: "get_started_button",
              style: "primary"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Learn More"
              },
              action_id: "learn_more_button"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Help"
              },
              action_id: "help_button",
              style: "danger"
            }
          ]
        }
      ]
    });

   await new Promise((resolve) => setTimeout(resolve, 3000));

   try {
     await app.client.chat.update({
       channel: msg.channel,
       ts: msg.ts,
       text: "Hello <@${message.user}>! 👋 I'm here to help you."
      })
    }
    catch (error) {
      console.error('Error updating message:', (error as any).data);
    }

  } catch (error) {
    console.error('Error sending message:', error);
  }
});

// Handle button interactions
app.action('get_started_button', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  
  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Great choice, <@${body.user.id}>! Let's get you started. Here are some quick actions:`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• Type `hello` to see this menu again\n• Type `status` to check bot status\n• Type `help` for more commands"
          }
        }
      ]
    });
  } catch (error) {
    console.error('Error handling get started:', error);
  }
});

app.action('learn_more_button', async ({ body, ack, say }) => {
  await ack();
  
  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hey <@${body.user.id}>! Here's more information about what I can do:`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: "*🤖 Bot Features:*\nInteractive buttons and responses"
            },
            {
              type: "mrkdwn",
              text: "*💬 Communication:*\nReal-time messaging via Socket Mode"
            },
            {
              type: "mrkdwn",
              text: "*🔧 Customizable:*\nEasy to extend with new commands"
            },
            {
              type: "mrkdwn",
              text: "*📱 Multi-platform:*\nWorks across all Slack clients"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error handling learn more:', error);
  }
});

app.action('help_button', async ({ body, ack, say }) => {
  await ack();
  
  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Need help, <@${body.user.id}>? Here are the available commands:`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "`hello` - Show the main menu\n`status` - Check bot status\n`@botname` - Mention me for assistance\n\nFor technical support, contact your administrator."
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Back to Menu"
              },
              action_id: "back_to_menu"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error handling help:', error);
  }
});

app.action('back_to_menu', async ({ body, ack, say }) => {
  await ack();
  
  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Welcome back, <@${body.user.id}>! 👋`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Get Started"
              },
              action_id: "get_started_button",
              style: "primary"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Learn More"
              },
              action_id: "learn_more_button"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Help"
              },
              action_id: "help_button",
              style: "danger"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error going back to menu:', error);
  }
});

// Listen for app mentions
app.event('app_mention', async ({ event, say }) => {
  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hi there <@${event.user}>! You mentioned me. How can I help?`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Show Menu"
              },
              action_id: "get_started_button",
              style: "primary"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error handling mention:', error);
  }
});

// Handle status command
app.message('status', async ({ say }) => {
  try {
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🟢 *Bot Status: Online*"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: "*Connection:* Socket Mode Active"
            },
            {
              type: "mrkdwn",
              text: "*Uptime:* Running smoothly"
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error sending status:', error);
  }
});

// Error handling
app.error((error) => {
  console.error('Slack app error:', error);
});


try {
await app.start();
console.log('⚡️ Slack bot is running with Socket Mode!');
} catch (error) {
console.error('Failed to start the app:', error);
}