/**
 * k6 stress test — n8n self-hosted on K3s
 *
 * Run locally:
 *   k6 run --env BASE_URL=https://your-domain.example.com load-tests/k6-script.js
 *
 * Run with output to InfluxDB / Grafana Cloud k6:
 *   k6 run --out influxdb=http://localhost:8086/k6 load-tests/k6-script.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://n8n.rvalentino.com";
const WEBHOOK_PATH = __ENV.WEBHOOK_PATH || "/webhook/test-endpoint"; // TODO: set real path

const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "1m", target: 10 },   // ramp-up
    { duration: "3m", target: 50 },   // sustained load
    { duration: "2m", target: 100 },  // stress
    { duration: "1m", target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],          // < 5% errors
    http_req_duration: ["p(99)<500"],         // p99 < 500 ms
    errors: ["rate<0.05"],
  },
};

export default function () {
  // Test 1 — n8n healthcheck
  const health = http.get(`${BASE_URL}/healthz`);
  check(health, { "healthz 200": (r) => r.status === 200 });
  errorRate.add(health.status !== 200);

  // Test 2 — Webhook endpoint
  const payload = JSON.stringify({ event: "k6-test", timestamp: Date.now() });
  const params = { headers: { "Content-Type": "application/json" } };
  const webhook = http.post(`${BASE_URL}${WEBHOOK_PATH}`, payload, params);
  check(webhook, { "webhook 200": (r) => r.status === 200 });
  errorRate.add(webhook.status !== 200);

  sleep(1);
}
