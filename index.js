#!/usr/bin/env node
const chalk = require('chalk');
const fs = require('fs')
const { exec } = require('child_process')

function getNpmVersion() {
  const data = fs.readFileSync('package.json', 'utf8')
  return JSON.parse(data).version
}

const getNewPatchVersion = (version) => {
  const nums = version.split('.')
  nums[2] = Number(nums[2]) + 1
  return nums.join('.')
}

const getNewMinorVersion = (version) => {
  const nums = version.split('.')
  nums[1] = Number(nums[1]) + 1
  return nums.join('.')
}

const getNewMajorVersion = (version) => {
  const nums = version.split('.')
  nums[0] = Number(nums[0]) + 1
  return nums.join('.')
}

const getCmdOptions = (releaseMode, options) => {
  const beforeStage = options.beforeStage || ''
  const beforeStageCmd = `--scripts.beforeStage="${beforeStage}${beforeStage && ' ' || ''}npx version-changelog CHANGELOG.md --remote github && git add CHANGELOG.md"`
  const githubReleaseCmd = '--github.release=true'
  let cmdOptions = `${beforeStageCmd} --no-git.requireCleanWorkingDir --use=pkg.version ${githubReleaseCmd} -n`

  !options.npmPublish && (cmdOptions += ' --no-npm.publish')

  if (releaseMode === 'PATCH') {
    cmdOptions += ` --git.tagName='v${getNewPatchVersion(getNpmVersion())}'`
  } else if (releaseMode === 'MINOR') {
    cmdOptions += ` --git.tagName='v${getNewMinorVersion(getNpmVersion())}'`
  } else if (releaseMode === 'MAJOR') {
    cmdOptions += ` --git.tagName='v${getNewMajorVersion(getNpmVersion())}'`
  }
  return cmdOptions
}

const readLastCommit = () => {
  return new Promise((resolve, reject) => {
    exec('git log --oneline -n 1', (err, res) => {
      const commitMessage = res.slice(8)
      if (err) {
        reject(err)
      } else {
        resolve(commitMessage)
      }
    })
  })
}

const publishPatch = (options) => {
  console.log(chalk.yellow('Publishing Patch version...'))
  return new Promise((resolve, reject) => {
    exec(`npx release-it patch ${getCmdOptions('PATCH', options)}`, (err, res) => {
      if (err) {
        reject(err)
      } else {
        console.log(chalk.blue(`Patch version ${chalk.blue.bold(getNewPatchVersion(getNpmVersion()))} published`))
        resolve()
      }
    })
  })
}

const publishMinor = (options) => {
  console.log(chalk.yellow('Publishing Minor version...'))
  return new Promise((resolve, reject) => {
    exec(`npx release-it minor ${getCmdOptions('MINOR', options)}`, (err, res) => {
      if (err) {
        reject(err)
      } else {
        console.log(chalk.blue(`Minor version ${chalk.blue.bold(getNewMinorVersion(getNpmVersion()))} published`))
        resolve()
      }
    })
  })
}

const publishMajor = (options) => {
  console.log(chalk.yellow('Publishing Major version...'))
  return new Promise((resolve, reject) => {
    exec(`npx release-it major ${getCmdOptions('MAJOR', options)}`, (err, res) => {
      if (err) {
        reject(err)
      } else {
        console.log(chalk.blue(`Major version ${chalk.blue.bold(getNewMajorVersion(getNpmVersion()))} published`))
        resolve()
      }
    })
  })
}

const getBranchName = () => {
  return new Promise((resolve, reject) => {
    exec("git symbolic-ref --short HEAD", (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const checkChangelog = () => {
  return new Promise((resolve, reject) => {
    exec('npx changelog-verify CHANGELOG.md --unreleased', (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const setNpmTagVersion = () => {
  return new Promise((resolve, reject) => {
    exec('npm config set tag-version-prefix ""', (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const getNpmTagVersion = () => {
  return new Promise((resolve, reject) => {
    exec('npm config get tag-version-prefix', (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const hasUnreleased = (options) => {
  const changelogName = options.changelog || 'CHANGELOG.md'
  const data = fs.readFileSync(changelogName, 'utf8');
  const versionHeadingRegex = /(## \[.*?\].*)/g;
  const unreleasedHeadingRegex = /(## \[Unreleased\].*)/g;
  const modificationTypeRegex = /(###.*)/g;
  const groups = data.split(versionHeadingRegex)
  return groups.length > 1 && unreleasedHeadingRegex.test(groups[1])
    && groups.length > 2 && modificationTypeRegex.test(groups[2])
}

const publishFromCI = async (options) => {
  const lastCommit = await readLastCommit()
  const minorBranchName = options.minorBranch || 'develop'
  const isDevOrigin = new RegExp(`^Merge pull request.*(\/${minorBranchName})./`).test(lastCommit.trim())
  const isOtherOrigin = new RegExp('^Merge pull request.*').test(lastCommit.trim())
  // if pr origin is dev publish minor
  if (isDevOrigin) {
    await publishMinor(options)
  // if pr origin is another branch
  } else if (isOtherOrigin) {
    await publishPatch(options)
  } else {
    console.log(chalk.yellow('Will not publish because the last commit is not from a pull request'))
  }
}

const getLastCommit = async (origin = 'HEAD') => {
  return new Promise((resolve, reject) => {
    exec(`git rev-parse ${origin}`, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const isSyncWithBase = (options) => {
  return new Promise(async (resolve, reject) => {
    const lastCommit = await getLastCommit()
    const lastCommitOfBase = await getLastCommit(`${options.baseBranch || 'master'}@{upstream}`)
    resolve(lastCommit === lastCommitOfBase)
  })
}

module.exports = {
  getBranchName,
  checkChangelog,
  hasUnreleased,
  isSyncWithBase,
  publishPatch,
  publishMinor,
  publishMajor,
  publishFromCI,
}

