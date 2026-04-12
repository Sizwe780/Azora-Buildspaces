import http from 'k6/http';
import { sleep, check } from 'k6';

// Simulating concurrent users interacting with workspace API
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 concurrent users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test root shell loading
  const res = http.get(`${BASE_URL}/workspace`);
  
  check(res, {
    'workspace loaded': (r) => r.status === 200,
  });

  // Small delay simulating JS load/parse time
  sleep(1);

  // Test AI Studio initialization
  const roomRes = http.get(`${BASE_URL}/workspace?room=ai-studio`);
  
  check(roomRes, {
    'sub-room loaded': (r) => r.status === 200,
  });

  // Test a fast agent endpoint mock for load check
  const apiRes = http.get(`${BASE_URL}/api/health`);
  check(apiRes, {
    'API health OK': (r) => r.status === 200,
  });

  // User reading wait
  sleep(2);
}