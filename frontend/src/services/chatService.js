
import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000/api/v1",
});

export const sendChatMessage = async ({
  question,
  conversationId,
  documentId = null,
  limit = 5,
}) => {
  const response = await API.post("/chat/", {
    question,
    conversation_id: conversationId,
    document_id: documentId,
    limit,
  });

  return response.data;
};
