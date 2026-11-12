# Jenkins SCM Polling Test

This documentation file tests automatic Jenkins CI/CD.

Expected workflow:

1. Push a commit to GitHub main.
2. Jenkins detects the change using SCM Polling.
3. Jenkins starts the pipeline automatically.
4. Jenkins runs CI checks.
5. Jenkins builds and pushes a Docker image.
6. Jenkins deploys to the easyshop-cicd namespace.

The original EasyShop application and both MongoDB
databases must remain unchanged.
