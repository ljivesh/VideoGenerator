import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export const useConversation = () => {
  //user and bot conversation array of objects {role: "user" or "bot", content: "user response" or "bot response"}
  const [conversation, setConversation] = useState([]);

  //push user response to conversation array
  const pushUserConversation = (userResponse) => {
    setConversation([...conversation, { role: "user", content: userResponse }]);
  };

  const addToConversation = useCallback(
    (content, role) => {
      //for user response
      if (role === "user") {
        setConversation((prev) => [
          ...prev,
          { role: "user", content: content },
        ]);
        return;
      }

      const last = conversation.slice(-1)[0];
      if(last?.role === 'assistant') {
        const newConversation = conversation.slice(0, conversation.length - 1);
        newConversation.push({
          role: "assistant",
          content: last.content + " " + content,
        });

        setConversation(newConversation);
      } else {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: content },
        ]);
      }
    },
    [conversation]
  );

  const pushBotConversation = (botResponse) => {
    setConversation([
      ...conversation,
      { role: "assistant", content: botResponse },
    ]);
  };

  const disableModel = async () => {
    await axios.post("/api/speech/disable-model");
    // console.log(response.data);
  };

  const enableModel = async () => {
    await axios.post("/api/speech/enable-model");
  };

  //send conversation to server
  useEffect(() => {
    const sendConversation = async () => {
      const response = await axios.post("/api/speech/post-conversation", {
        conversation: conversation,
      });
      console.log(`Final response: ${response.data}`);
    };

    //if last object in conversation array is user response, send conversation to server
    if (conversation.slice(-1)[0]?.role === "user") {
      console.log(conversation);
      sendConversation();

    }
  }, [conversation]);


  return {
    conversation,
    pushUserConversation,
    setConversation,
    disableModel,
    enableModel,
    addToConversation,
  };
};
