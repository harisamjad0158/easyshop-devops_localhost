pipeline {
    agent any

    environment {
        IMAGE_NAME = 'easyshop-ci'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
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
    }

    post {
        always {
            echo 'EasyShop CI pipeline finished.'
        }

        success {
            echo 'All EasyShop CI checks passed.'
            echo 'Docker image build completed successfully.'
        }

        failure {
            echo 'EasyShop CI/CD failed. Review Jenkins stage logs.'
        }
    }
}
