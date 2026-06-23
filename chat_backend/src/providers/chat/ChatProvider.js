class ChatProvider {
  getUsers() {
    throw new Error("getUsers() must be implemented by provider");
  }

  getConversations() {
    throw new Error("getConversations() must be implemented by provider");
  }

  getMessages() {
    throw new Error("getMessages() must be implemented by provider");
  }

  sendMessage() {
    throw new Error("sendMessage() must be implemented by provider");
  }

  sendFile() {
    throw new Error("sendFile() must be implemented by provider");
  }

  addReaction() {
    throw new Error("addReaction() must be implemented by provider");
  }

  removeReaction() {
    throw new Error("removeReaction() must be implemented by provider");
  }
}

export default ChatProvider;
