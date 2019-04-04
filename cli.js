#!/usr/bin/env node

/**
 * CMD options available:
 * 
 * --baseBranch {the base branch to where must be made the release, default is 'master'}
 * --beforeStage {the commands to be executed before the release and after check the conditions}
 * --changelog {the changelog file name, default is 'CHANGELOG.md'}
 * --minorBranch {the minor base branch, default is 'develop'}
 * --npmPublish {If can publish to npm, default is false}
 * --releaseType {The release type 'patch' | 'minor' | 'major', default is empty}
 * --ci {If the environment is on the continuous integration, default is empty}
 */
(async () => {
  const chalk = require('chalk');
  const parseArgs = require('yargs-parser')
  const GithubReleasy = require('./index.js')
  const options = parseArgs(process.argv.slice(2))
  try {
    console.log(chalk.green.underline.bold('Initiating GitHub Releasy:\n'));
    // CHECK IF THE BRANCH IS SYNC WITH THE BASE
    const releaseType = options.releaseType
    const isSyncWithBase = await GithubReleasy.isSyncWithBase(options)
    // RELEASE IN THE COMMAND LINE
    if (releaseType) {
      if (!isSyncWithBase) {
        console.log(chalk.red('Cannot proceed with release. Branch is not sync with master'));
        process.exit(1)
        return
      }
      switch(releaseType) {
        case 'patch':
          await GithubReleasy.publishPatch(options)
          break
        case 'minor':
          await GithubReleasy.publishMinor(options)
          break
        case 'major':
          await GithubReleasy.publishMajor(options)
          break
      }
      process.exit(0)
      // RELEASE IN THE CI ENVIRONMENT
    } else if (options.ci) {
      const branchName = await GithubReleasy.getBranchName()
      const baseBranch = options.baseBranch || 'master'
      const branchNameScaped = branchName.replace(/\n/g, '').trim()
      // Check if is from a pull request
      if (branchNameScaped !== baseBranch) {
        console.log(chalk.yellow(`Build is from a pull request event`))
        await GithubReleasy.checkChangelog()
        console.log(chalk.yellow(`Will not publish because the branch ${branchNameScaped} is different of the baseBranch ${baseBranch}.`))
      // Otherwise is from a push in the baseBranch
      } else {
        console.log(chalk.yellow(`Build is from a push event`))
        if (!GithubReleasy.hasUnreleased(options)) {
          console.log(chalk.red('Will not publish because there isn\'t unreleased changes in changelog.'))
          process.exit(0)
          return
        }
      }
      await GithubReleasy.publishFromCI(options)
      process.exit(0)
    // DOES NOTHING, JUST LOG IT
    } else {
      console.log(chalk.red('Cannot proceed with release. You must specify the --releaseType or --ci option'))
      process.exit(0)
    }
  } catch(err) {
    console.error(err)
    process.exit(1)
  }
})()