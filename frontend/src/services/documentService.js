
import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000/api/v1",
});

// Upload a document
export const uploadDocument = async (file, chunkingStrategy) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("chunking_strategy", chunkingStrategy);

  const response = await API.post(
    "/documents/upload",
    formData
  );

  return response.data;
};

// Retrieve all uploaded documents
export const getDocuments = async () => {
  const response = await API.get("/documents/");

  return response.data;
};

// Retrieve a specific document
export const getDocument = async (documentId) => {
  const response = await API.get(
    `/documents/${documentId}`
  );

  return response.data;
};

// Delete a document
export const deleteDocument = async (documentId) => {
  const response = await API.delete(
    `/documents/${documentId}`
  );

  return response.data;
};
