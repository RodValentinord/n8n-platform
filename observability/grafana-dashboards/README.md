# Grafana Dashboards

Place dashboard JSON files here. They are auto-provisioned via the Grafana Helm values.

## Planned Dashboards

| File | Description |
|---|---|
| `cluster-overview.json` | Node CPU/RAM/disk, K3s pod count |
| `n8n-metrics.json` | Workflow executions, error rate, queue depth |
| `postgresql.json` | Queries/s, connections, replication lag |
| `redis.json` | Memory usage, hit rate, evictions |
| `canary-status.json` | Argo Rollouts canary weight + analysis results |

## TODO

- Export dashboards from a running Grafana instance and commit the JSONs here.
- Tag each dashboard with `n8n-platform` for filtering.
