import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";
import express from "express";
import { initializeAgent } from "./llm.js";
import { DiscordRequest, getRandomEmoji } from "./utils.js";

const chatHistory = [];
const agent = await initializeAgent();

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
    // Interaction type and data
    const { type, id, data } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data;

      // "test" command
      if (name === "test") {
        // Send a message into the channel where command was triggered from
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: `hello world ${getRandomEmoji()}`,
          },
        });
      }

      if (name === "chat" && id) {
        // Interaction context
        const context = req.body.context;
        // User ID is in user field for (G)DMs, and member for servers
        const userId =
          context === 0 ? req.body.member.user.id : req.body.user.id;

        const input = `User ${userId} says: ${data.options[0].value}`;

        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: `${data.options[0].value} ${getRandomEmoji()}`,
          },
        });

        const responseFromAI = await agent.invoke({
          input,
          chat_history: chatHistory,
        });

        chatHistory.push(new HumanMessage(input));
        chatHistory.push(new AIMessage(responseFromAI.output));

        const endpoint = `channels/${req.body.channel.id}/messages`;
        await DiscordRequest(endpoint, {
          method: "POST",
          body: {
            content: responseFromAI.output,
          },
        });
        return;
      }

      console.error(`unknown command: ${name}`);
      return res.status(400).json({ error: "unknown command" });
    }

    console.error("unknown interaction type", type);
    return res.status(400).json({ error: "unknown interaction type" });
  },
);

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
