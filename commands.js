import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Chat with AI command
const CHAT_COMMAND = {
  name: "chat",
  description: "Chat with an AI",
  options: [
    {
      type: 3,
      name: "text",
      description: "Input what you want to say",
      required: true,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, CHAT_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
