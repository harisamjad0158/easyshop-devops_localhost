pipeline {
    agent {
        docker {
            image 'node:18-alpine'
            args '-u root:root'
        }
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

    post {
        always {
            echo 'EasyShop CI pipeline finished.'
        }
        success {
            echo 'All EasyShop CI checks passed.'
        }
        failure {
            echo 'EasyShop CI failed. Review the stage logs.'
        }
    }
}
