{{/*
Chart name truncado a 63 chars.
*/}}
{{- define "n8n.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fullname: release-name + chart-name, truncado a 63 chars.
*/}}
{{- define "n8n.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Labels comuns aplicados a todos os recursos.
CORREÇÃO: adicionados name e instance — obrigatórios para helm status,
          helm uninstall e seleção por label funcionar corretamente.
*/}}
{{- define "n8n.labels" -}}
helm.sh/chart: {{ include "n8n.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "n8n.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: n8n
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels para um componente específico.
Uso: include "n8n.selectorLabels" (dict "context" . "role" "main")

Nota: o "role" vira o valor de app.kubernetes.io/component,
que é o que o Argo Rollouts usa para distinguir main/webhook/worker.
*/}}
{{- define "n8n.selectorLabels" -}}
app.kubernetes.io/name: {{ include "n8n.name" .context }}
app.kubernetes.io/instance: {{ .context.Release.Name }}
app.kubernetes.io/component: {{ .role }}
{{- end }}

{{/*
Nome do Secret a usar (existente ou criado pelo chart).
*/}}
{{- define "n8n.secretName" -}}
{{- if .Values.existingSecret }}
{{- .Values.existingSecret }}
{{- else }}
{{- include "n8n.fullname" . }}-secrets
{{- end }}
{{- end }}

{{/*
Nome do ConfigMap.
*/}}
{{- define "n8n.configMapName" -}}
{{- include "n8n.fullname" . }}-config
{{- end }}

{{/*
Nome do ServiceAccount.
*/}}
{{- define "n8n.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "n8n.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Annotations de Prometheus scrape aplicadas a todos os pods.
Merge com podAnnotations extras definidos em values.

CORREÇÃO: substituído o bloco misto (strings hardcoded + toYaml) por
          um único dict que depois vira YAML limpo via toYaml.
          Isso evita linhas em branco e garante indentação correta
          quando o caller usar: include "n8n.podAnnotations" . | nindent 8
*/}}
{{- define "n8n.podAnnotations" -}}
{{- $base := dict
    "prometheus.io/scrape" "true"
    "prometheus.io/port"   "5678"
    "prometheus.io/path"   "/metrics"
-}}
{{- if .Values.podAnnotations }}
{{- $merged := merge .Values.podAnnotations $base }}
{{- toYaml $merged }}
{{- else }}
{{- toYaml $base }}
{{- end }}
{{- end }}