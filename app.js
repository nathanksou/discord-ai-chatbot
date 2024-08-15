import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";
import express from "express";
import { initializeAgent } from "./app/llm.js";
import { DiscordRequest, getRandomEmoji } from "./app/utils.js";

const chatHistory = [];
const agent = await initializeAgent();

const app = express();
const PORT = process.env.PORT || 3000;

app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
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

      if (name === "test") {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `hello world ${getRandomEmoji()}`,
          },
        });
      }

      if (name === "chat" && id) {
        const context = req.body.context;
        const userId =
          context === 0 ? req.body.member.user.id : req.body.user.id;
        const message = data.options[0].value;
        const input = `User ${userId} says: ${message}`;

        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: message },
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
