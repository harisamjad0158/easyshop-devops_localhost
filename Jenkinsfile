pipeline {
    agent any

    environment {
        IMAGE_NAME = 'easyshop-ci'
        DOCKERHUB_USERNAME = 'johncorner158'
        DOCKERHUB_CREDENTIALS = 'dockerhub-easyshop'
        DOCKERHUB_IMAGE = 'johncorner158/easyshop-ci'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('CI Checks') {
            agent {
                docker {
                    image 'node:18-alpine'
                    reuseNode true
                    args '-u root:root'
                }
            }

            stages {
                stage('Install Dependencies') {
                    steps {
                        sh 'npm ci'
                    }
                }

                stage('TypeScript Check') {
                    steps {
                        sh 'npx tsc --noEmit'
                    }
                }

                stage('Lint') {
                    steps {
                        sh 'CI=1 npm run lint'
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    env.IMAGE_TAG = "build-${env.BUILD_NUMBER}"
                }

                sh '''
                    set -eu

                    docker build \
                      -t "${IMAGE_NAME}:${IMAGE_TAG}" \
                      .
                '''
            }
        }

        stage('Verify Docker Image') {
            steps {
                sh '''
                    set -eu

                    docker image inspect \
                      "${IMAGE_NAME}:${IMAGE_TAG}" \
                      >/dev/null

                    echo "PASS: Docker image created."
                    echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
                '''
            }
        }

        stage('Tag Docker Image') {
            steps {
                sh '''
                    set -eu

                    docker tag \
                      "${IMAGE_NAME}:${IMAGE_TAG}" \
                      "${DOCKERHUB_IMAGE}:${IMAGE_TAG}"

                    docker image inspect \
                      "${DOCKERHUB_IMAGE}:${IMAGE_TAG}" \
                      >/dev/null

                    echo "Docker Hub image tagged successfully."
                '''
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-easyshop',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x

                        export DOCKER_CONFIG="$(mktemp -d)"
                        trap 'rm -rf "$DOCKER_CONFIG"' EXIT

                        printf '%s' "$DOCKER_TOKEN" |
                          docker login \
                            --username "$DOCKER_USER" \
                            --password-stdin

                        docker push \
                          "${DOCKERHUB_IMAGE}:${IMAGE_TAG}"

                        docker logout >/dev/null 2>&1 || true

                        echo "Docker Hub image pushed successfully."
                    '''
                }
            }
        }
        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    set -eu
                    set +x

                    echo "Refreshing restricted Kubernetes credentials..."

                    sudo -n /usr/local/libexec/easyshop/create-kubeconfig

                    export KUBECONFIG=/var/lib/easyshop/jenkins-kube/config

                    NAMESPACE="easyshop-cicd"
                    DEPLOYMENT="easyshop-cicd"
                    CONTAINER="easyshop"
                    IMAGE="${DOCKERHUB_IMAGE}:${IMAGE_TAG}"

                    echo "Verifying Kubernetes identity..."

                    kubectl auth whoami | grep -F \
                        "system:serviceaccount:easyshop-cicd:jenkins-deployer" \
                        >/dev/null

                    echo "Deploying image: $IMAGE"

                    kubectl set image \
                        "deployment/$DEPLOYMENT" \
                        "$CONTAINER=$IMAGE" \
                        -n "$NAMESPACE"

                    echo "Waiting for Kubernetes rollout..."

                    ATTEMPT=0
                    MAX_ATTEMPTS=60

                    while [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; do
                        ATTEMPT=$((ATTEMPT + 1))

                        STATUS=$(kubectl get deployment "$DEPLOYMENT" \
                            -n "$NAMESPACE" \
                            -o jsonpath='{.metadata.generation}{"|"}{.status.observedGeneration}{"|"}{.spec.replicas}{"|"}{.status.updatedReplicas}{"|"}{.status.readyReplicas}{"|"}{.status.availableReplicas}')

                        IFS='|' read -r \
                            GENERATION OBSERVED DESIRED UPDATED READY AVAILABLE \
                            <<EOF_STATUS
$STATUS
EOF_STATUS

                        GENERATION="${GENERATION:-0}"
                        OBSERVED="${OBSERVED:-0}"
                        DESIRED="${DESIRED:-0}"
                        UPDATED="${UPDATED:-0}"
                        READY="${READY:-0}"
                        AVAILABLE="${AVAILABLE:-0}"

                        CURRENT_IMAGE=$(kubectl get deployment "$DEPLOYMENT" \
                            -n "$NAMESPACE" \
                            -o jsonpath='{.spec.template.spec.containers[?(@.name=="easyshop")].image}')

                        if [ "$GENERATION" = "$OBSERVED" ] &&
                           [ "$UPDATED" = "$DESIRED" ] &&
                           [ "$READY" = "$DESIRED" ] &&
                           [ "$AVAILABLE" = "$DESIRED" ] &&
                           [ "$CURRENT_IMAGE" = "$IMAGE" ]; then

                            echo "PASS: Kubernetes deployment successful."
                            echo "Image: $CURRENT_IMAGE"
                            exit 0
                        fi

                        echo "Rollout pending ($ATTEMPT/$MAX_ATTEMPTS)"
                        sleep 5
                    done

                    echo "FAIL: Kubernetes rollout timed out."
                    exit 1
                '''
            }
        }

    }

    post {
        always {
            echo 'EasyShop CI/CD pipeline finished.'
        }

        success {
            echo 'All EasyShop CI checks passed.'
            echo 'Docker image built and pushed to Docker Hub.'
        }

        failure {
            echo 'EasyShop CI/CD failed. Review Jenkins stage logs.'
        }
    }
}
