/**
 * k6 stress test — n8n webhook throughput
 *
 * Foco: volume de requisições no webhook de produção.
 * Cada VU dispara o webhook continuamente sem sleep, simulando
 * integrações externas enviando eventos em rajada.
 *
 * Run:
 *   k6 run load-tests/k6-script.js
 *   k6 run --env BASE_URL=https://n8n.rvalentino.com load-tests/k6-script.js
 */

import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://n8n.rvalentino.com";
const WEBHOOK_PATH = __ENV.WEBHOOK_PATH || "/webhook/k6-stress";

const errorRate = new Rate("errors");
const webhookDuration = new Trend("webhook_duration", true);

export const options = {
  stages: [
    { duration: "30s", target: 10  },  // aquecimento
    { duration: "1m",  target: 50  },  // carga moderada
    { duration: "2m",  target: 100 },  // estresse
    { duration: "1m",  target: 200 },  // pico máximo
    { duration: "30s", target: 0   },  // ramp-down
  ],
  thresholds: {
    http_req_failed:   ["rate<0.05"],   // < 5% de erros HTTP
    http_req_duration: ["p(99)<2000"],  // p99 < 2s (workflow processa dados reais)
    errors:            ["rate<0.05"],
  },
};

export default function () {
  const payload = JSON.stringify({
    event:     "k6-stress",
    vu:        __VU,
    iteration: __ITER,
    timestamp: Date.now(),
  });

  const res = http.post(`${BASE_URL}${WEBHOOK_PATH}`, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: "10s",
  });

  const ok = check(res, {
    "status 200":        (r) => r.status === 200,
    "body processado":   (r) => r.json("processed") === true,
  });

  errorRate.add(!ok);
  webhookDuration.add(res.timings.duration);
}
