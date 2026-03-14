import axios from 'axios';
import { BASE_URL } from '../config';

const getToken = () => localStorage.getItem('token');
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

export const getOrgSettings = () =>
  axios.get(`${BASE_URL}/org/settings`, { headers: headers() });

export const saveOrgSettings = (data) =>
  axios.put(`${BASE_URL}/org/settings`, data, { headers: headers() });
