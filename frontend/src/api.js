import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  console.log("Interceptor executed");

  config.headers["ngrok-skip-browser-warning"] = "true";
  config.headers["Accept"] = "application/json";

  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log(config.headers);

  return config;
});

export default api;