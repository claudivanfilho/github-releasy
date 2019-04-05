# Github Releasy

A npm package to help with release and changelog management over github repositories.

## Installation

```
npm install -g github-releasy
```

## Usage

Just run the command `github-release` with the optional options below.

CMD options available:

- --baseBranch {the base branch to where must be made the release, default is 'master'}
- --beforeStage {the commands to be executed before the release and after check the conditions}
- --changelog {the changelog file name, default is 'CHANGELOG.md'}
- --minorBranch {the minor base branch, default is 'develop'}
- --releaseType {The release type 'patch' | 'minor' | 'major', default is undefined}
- --ci {If the environment is on the continuous integration, default is undefined}

## Integration with CI

Automatize your workflow! Use the github-releasy to update you npm version, release, tag, changelog and publish to npm after a pull request to the base branch is merged.

#### How it works?
After a pull request has been updated the github-release checks if the branch has unreleased changes in the CHANGELOD.md, if not, fails the buils.

After a pull request is merged in the github, the push event is triggered in the CI and github-releasy checks the pattern in the last commit to know the origin of the pull request and so to decide which releaseType will be fired and released. Patch if the origin of the pull request is from a branch different of the base branch and Minor if the origin branch is from the minorBranch.

#### Configuration

In the Setup put the commands:
```
$ npm install
$ npm install -g npx github-releasy
$ git config --global user.email "<github email here>"
$ git config --global user.name "<github name here>"
```

In the Job put the commands:
```
$ export GITHUB_TOKEN=<your github token here>
$ github-releasy --ci
```

To generate a github token -> https://github.com/settings/tokens
(Just need the `repo` permission)
