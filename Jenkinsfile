pipeline {
    agent any

    environment {
        DOCKER_CREDS = 'dockerhub-creds'
        IMAGE_NAME = 'jasminekowaski/notesapp-app'
        IMAGE_TAG = "${BUILD_NUMBER}"
        KUBE_NAMESPACE = 'devproject'
    }

    stages {

        stage('Code Fetch Stage') {
            steps {
                echo 'Fetching DevProject code from GitHub...'
                checkout scm
                sh 'ls -la'
            }
        }

        stage('Docker Image Creation Stage') {
            steps {
                echo 'Building Docker image...'

                sh '''
                    docker build -t $IMAGE_NAME:$IMAGE_TAG .
                    docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest
                '''

                echo 'Pushing Docker image to DockerHub...'

                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push $IMAGE_NAME:$IMAGE_TAG
                        docker push $IMAGE_NAME:latest
                    '''
                }
            }
        }

        stage('Kubernetes Deployment Stage') {
            steps {
                echo 'Deploying DevProject to Kubernetes...'

                sh '''
                    kubectl apply -f k8s/namespace.yaml
                    kubectl apply -f k8s/mongo-pv.yaml
                    kubectl apply -f k8s/mongo-pvc.yaml
                    kubectl apply -f k8s/mongo-deployment.yaml
                    kubectl apply -f k8s/mongo-service.yaml
                    kubectl apply -f k8s/app-deployment.yaml
                    kubectl apply -f k8s/app-service.yaml
                    kubectl apply -f k8s/app-hpa.yaml

                    kubectl rollout restart deployment/devproject-app -n $KUBE_NAMESPACE
                    kubectl rollout status deployment/devproject-app -n $KUBE_NAMESPACE
                    kubectl rollout status deployment/devproject-mongo -n $KUBE_NAMESPACE

                    kubectl get pods -n $KUBE_NAMESPACE
                    kubectl get svc -n $KUBE_NAMESPACE
                    kubectl get pvc -n $KUBE_NAMESPACE
                    kubectl get hpa -n $KUBE_NAMESPACE
                '''
            }
        }

        stage('Prometheus Grafana Stage') {
            steps {
                echo 'Checking monitoring setup...'

                sh '''
                    if kubectl get crd servicemonitors.monitoring.coreos.com > /dev/null 2>&1; then
                        kubectl apply -f k8s/servicemonitor.yaml || true
                        echo "ServiceMonitor applied successfully."
                    else
                        echo "ServiceMonitor CRD not found. Application still exposes /metrics endpoint."
                    fi

                    echo "DevProject app metrics endpoint: /metrics"
                    echo "DevProject app is exposed through service devproject-app-service"
                    kubectl get pods -n monitoring || true
                    kubectl get svc -n monitoring || true
                '''
            }
        }
    }

    post {
        success {
            echo 'DevProject CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'DevProject CI/CD pipeline failed.'
        }

        always {
            sh 'kubectl get all -n devproject || true'
        }
    }
}

