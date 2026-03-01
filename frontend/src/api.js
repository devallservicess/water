import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const api = {
    getDashboard: (week) => axios.get(`${API_BASE_URL}/dashboard${week ? `?week=${week}` : ''}`),
    getEmployees: () => axios.get(`${API_BASE_URL}/employees/all`),
    addEmployee: (data) => axios.post(`${API_BASE_URL}/employees`, data),
    toggleEmployee: (id) => axios.post(`${API_BASE_URL}/employees/${id}/toggle`),
    setEmployeeSkills: (id, skills) => axios.post(`${API_BASE_URL}/employees/${id}/skills`, { skills }),
    getPlanning: (week) => axios.get(`${API_BASE_URL}/planning/all${week ? `?week=${week}` : ''}`),
    generatePlanning: (week_start) => axios.post(`${API_BASE_URL}/planning/generate`, { week_start }),
    getAbsences: () => axios.get(`${API_BASE_URL}/absences/all`),
    requestAbsence: (data) => axios.post(`${API_BASE_URL}/absences/request`, data),
    approveAbsence: (id) => axios.post(`${API_BASE_URL}/absences/${id}/approve`),
    rejectAbsence: (id) => axios.post(`${API_BASE_URL}/absences/${id}/reject`),
    chatMsg: (message) => axios.post(`${API_BASE_URL}/chat`, { message }),
    getAnalytics: (week) => axios.get(`${API_BASE_URL}/analytics${week ? `?week=${week}` : ''}`),
};
