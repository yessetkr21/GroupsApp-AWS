#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  GroupsApp — Kubernetes deployment script (AWS EKS)
#
#  Usage:
#    ./k8s/deploy.sh [--registry <ecr-uri>] [--tag <image-tag>]
#
#  Prerequisites:
#    - kubectl configured for EKS cluster
#    - AWS ECR repositories created
#    - AWS Load Balancer Controller installed
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGISTRY="${REGISTRY:-533267341242.dkr.ecr.us-east-1.amazonaws.com}"
TAG="${TAG:-latest}"
NAMESPACE="groupsapp"

echo "==> Building and pushing Docker images..."
SERVICES=(backend messages-service groups-service frontend)
for svc in "${SERVICES[@]}"; do
  echo "  Building groupsapp-${svc}:${TAG}"
  docker build -t "groupsapp-${svc}:${TAG}" "./${svc}"
  docker tag "groupsapp-${svc}:${TAG}" "${REGISTRY}/groupsapp-${svc}:${TAG}"
  docker push "${REGISTRY}/groupsapp-${svc}:${TAG}"
done

echo "==> Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
# NOTE: apply secret.yaml manually after filling in credentials
# kubectl apply -f k8s/secret.yaml

kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/etcd.yaml

echo "  Waiting for RabbitMQ and etcd to be ready..."
kubectl rollout status deployment/rabbitmq -n ${NAMESPACE} --timeout=120s
kubectl rollout status deployment/etcd -n ${NAMESPACE} --timeout=60s

kubectl apply -f k8s/messages-service.yaml
kubectl apply -f k8s/groups-service.yaml

echo "  Waiting for gRPC services..."
kubectl rollout status deployment/messages-service -n ${NAMESPACE} --timeout=120s
kubectl rollout status deployment/groups-service -n ${NAMESPACE} --timeout=120s

kubectl apply -f k8s/backend.yaml
kubectl rollout status deployment/backend -n ${NAMESPACE} --timeout=120s

kubectl apply -f k8s/frontend.yaml
kubectl rollout status deployment/frontend -n ${NAMESPACE} --timeout=60s

kubectl apply -f k8s/ingress.yaml

echo ""
echo "==> Deployment complete!"
echo "    Ingress:"
kubectl get ingress -n ${NAMESPACE}
echo ""
echo "    Pods:"
kubectl get pods -n ${NAMESPACE}
