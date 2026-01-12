import axios from "axios";

const baseURL = import.meta.env.VITE_BASE_URL;

const request = axios.create({
    baseURL,
    timeout: 10000,
});

request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzk4MTY2MDAzLCJpYXQiOjE3NjY2MzAwMDMsImp0aSI6Ijk2MTYwZTYwMDM1YTQ5NjJiODZiYmI1NzgwZDY3ZTI2IiwidXNlcl9pZCI6IjgifQ.WyWlDap3uNxLI_MoyUDWAFkOQJzrhjVksvPlUthJoV8`;
            config.headers["X-Project-Id"] =
                "c5ec93b3-ec97-4b1c-9dc6-34b94fbf5d16";
            config.headers["X-Service-Key"] = "123A";
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

request.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        console.error("API Error:", "Status:", status);
        return Promise.reject(error);
    }
);

export default request;
