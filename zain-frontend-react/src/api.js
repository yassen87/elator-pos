// zain-frontend-react/src/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080'; // PHP Built-in server on port 8080

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;
