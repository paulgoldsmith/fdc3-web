# Releasing a New Version of the Library

To release a new version of the library to the NPM registry, follow these steps:

1. **Run the Release Command**
    Execute the following command to start the release process:
    ```sh
    npm run release
    ```
    This command will prompt you to select the type of version bump (major, minor, patch, or pre-release). It will
    update the versions in package.json, create a CHANGELOG.md entry and commit those changes to your local workspace.

2. **Update Version and Create Pull Request**
    After the release command completes, a new version will be created. You need to:
    - Push the changes to your branch.
    - Raise a Pull Request (PR) with the updated version.

3. **Create a Release on GitHub**
    Once the PR is merged, create a new release on GitHub:
    - Go to the GitHub repository.
    - Navigate to the "Releases" section.
    - Click on "Draft a new release".
    - Select the tag version of the new version created.
    - Fill in the release details and publish the release.

Creating the release on GitHub will trigger a GitHub Action that will publish the new version to the NPM registry.