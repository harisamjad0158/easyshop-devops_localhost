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
        stage('Update GitOps Manifest') {
            steps {
                sh '''
                    set -eu

                    REPO="git@github.com:harisamjad0158/easyshop-devops_localhost.git"
                    IMAGE="${DOCKERHUB_IMAGE}:${IMAGE_TAG}"

                    GITOPS_DIR="$(mktemp -d)"
                    trap 'rm -rf "$GITOPS_DIR"' EXIT

                    echo "Cloning GitOps branch..."

                    git clone --quiet --branch gitops --single-branch "$REPO" "$GITOPS_DIR"

                    cd "$GITOPS_DIR"

                    git config user.name "EasyShop Jenkins CI"
                    git config user.email "jenkins@localhost"

                    MANIFEST="kubernetes/gitops/deployment.yaml"

                    echo "Updating image to: $IMAGE"

                    sed -i -E                       "s|^([[:space:]]*image:[[:space:]]*)johncorner158/easyshop-ci:build-[0-9]+[[:space:]]*$|\\1${IMAGE}|"                       "$MANIFEST"

                    IMAGE_COUNT=$(grep -Fxc                       "          image: $IMAGE" "$MANIFEST")

                    if [ "$IMAGE_COUNT" -ne 1 ]; then
                        echo "FAIL: GitOps image update was not unique."
                        false
                    fi

                    git add "$MANIFEST"

                    if git diff --cached --quiet; then
                        echo "GitOps manifest already up to date."
                    else
                        git commit -m "ci: deploy ${IMAGE_TAG} via GitOps"
                        git push origin HEAD:refs/heads/gitops
                    fi

                    echo "GitOps update completed."
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
