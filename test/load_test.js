import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 500, // Количество виртуальных пользователей
    duration: '10s', // Продолжительность теста
};

export default function () {
    const res = http.get('http://localhost:3000/api/players'); // Пример API-запроса
    check(res, {
        'is status 200': (r) => r.status === 200,
    });
    sleep(1);
}