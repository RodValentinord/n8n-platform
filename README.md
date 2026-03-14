# n8n-platform

Helm charts, observabilidade, CI/CD e documentação para o **n8n self-hosted em K3s** (Oracle Cloud Always Free).

---

## Visão Geral

Este repositório contém a camada de plataforma do ambiente n8n:

- **Helm chart** customizado do n8n com 3 componentes (main, webhook, worker)
- **Observabilidade** com Prometheus + Grafana + Loki
- **Canary deploy** com Argo Rollouts e validação automática via AnalysisTemplates
- **CI/CD** com GitHub Actions (lint → deploy → canary → promote/rollback)
- **Load tests** com k6

```
GitHub Push
    │
    ▼
GitHub Actions ──lint──► helm upgrade ──► Argo Rollouts Canary (20% → 50% → 100%)
                                                │
                                    AnalysisTemplate (Prometheus)
                                    error rate < 5% | p99 < 500ms
```

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| kubectl | 1.29 |
| helm | 3.14 |
| argo rollouts CLI | 1.7 |
| k6 | 0.50 |

Cluster K3s provisionado via [n8n-infra](https://github.com/RodValentinord/n8n-infra).

## Quick Start

```bash
# 1. Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# 2. Deploy observability stack
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f observability/prometheus-values.yaml

helm upgrade --install loki grafana/loki-stack \
  -n monitoring \
  -f observability/loki-values.yaml

# 3. Install Argo Rollouts
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f \
  https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# 4. Deploy n8n
helm upgrade --install n8n ./charts/n8n \
  -n n8n --create-namespace \
  -f charts/values/values-challenge.yaml

# 5. Run load test
k6 run --env BASE_URL=https://your-domain.example.com load-tests/k6-script.js
```

## Estrutura do Projeto

```
n8n-platform/
├── charts/
│   ├── n8n/                        # Helm chart customizado (main + webhook + worker)
│   └── values/
│       └── values-challenge.yaml   # Values para o cluster de 24 GB
├── observability/
│   ├── prometheus-values.yaml      # kube-prometheus-stack custom values + alert rules
│   ├── loki-values.yaml            # Loki + Promtail custom values
│   └── grafana-dashboards/         # JSONs de dashboards customizados
├── argo-rollouts/
│   └── analysis-templates.yaml    # AnalysisTemplate (error rate + p99 latência)
├── load-tests/
│   └── k6-script.js               # Teste de estresse (10→100 users, 7 min)
└── .github/workflows/
    └── deploy.yaml                 # Pipeline: lint → helm upgrade → canary
```

## Decisões Técnicas

| Decisão | Motivo |
|---|---|
| n8n em 3 componentes (main/webhook/worker) | Isolamento de blast radius — webhook e worker escalam independentemente |
| Argo Rollouts canary | Validação automática via métricas Prometheus antes de promover 100% |
| Loki em vez de ElasticSearch | Footprint de memória muito menor — compatível com 24 GB free tier |
| cert-manager + Let's Encrypt | TLS automático sem custo, integrado ao Nginx Ingress |
| Cloudflare na borda | DDoS protection + cache de assets + proxy para esconder IPs OCI |

## Como Acessar os Dashboards

Após o deploy, exponha o Grafana localmente:

```bash
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# Acesse http://localhost:3000 — usuário: admin
```

## GitHub Actions Secrets Necessários

| Secret | Descrição |
|---|---|
| `KUBECONFIG` | kubeconfig do cluster K3s (base64-encoded) |
| `SLACK_WEBHOOK_URL` | Webhook para alertas do AlertManager |
