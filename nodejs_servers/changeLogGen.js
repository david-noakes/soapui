const child = require('child_process');
const fs = require('fs');
// const Tag = require('./tag-model');
const Tag = class Tags {
  constructor (
    aList,
    tag,
    description
  ) {
    this.aList = aList;
    this.tag = tag;
    this.description = description;
  }

}

const pkgRepo = require('./package.json').repository;
console.log('pkgRepo', pkgRepo);
let gitRepo = '';
try { 
  const zs = child.execSync('git config --get remote.origin.url').toString();
  console.log('gitRepo:', zs);
  const z = zs.split('@');  // git@github.com
  gitRepo = z[z.length - 1];
  // console.log('gRepo after split:', gitRepo);
  if (z.length > 1) {
    // ssh format
    gitRepo = gitRepo.replace(':', '/');
  }
}
catch (error) {
  console.log(error.message);
  gitRepo = '';
}

if (gitRepo.trim().length == 0) {
  if (pkgRepo && pkgRepo.url) {
    const z = pkgRepo.url.split('+'); //  url: 'git+https://github.com/
    gitRepo = z[z.length - 1];
  } else {
    gitRepo = 'https://github.com/david-noakes/test-repo';
  }
}

gitRepo = gitRepo.replace('\n', '');
gitRepo = gitRepo.replace('.git', ''); // the commit URL doesn't use this

if (!gitRepo.startsWith('http')) {
  gitRepo = 'https://' + gitRepo;
}

console.log('repo:', gitRepo);

const latestTag = child.execSync('git describe --long').toString('utf-8').split('-')[0];

const output = child
    .execSync(`git log ${latestTag}..HEAD --date=format:%Y%m%d%H%M%S --format=%B~~BREAK~~%H~~BREAK~~%cd~~BREAK~~~~~~DELIMITER~~~~`)
    // .execSync(`git log --date=format:%Y%m%d%H%M%S --format=%B~~BREAK~~%H~~BREAK~~%cd~~BREAK~~~~~~DELIMITER~~~~`)
    .toString('utf-8');
// console.log(output);

const commitsArray = output
    .split('~~~~DELIMITER~~~~\n')
    .map(commit => {
    //   const [message, sha, isodate] = commit.split('\n');
       const [message, sha, isodate] = commit.split('~~BREAK~~');

        return { sha, message, isodate };
    })
    .filter(commit => Boolean(commit.sha));

//console.log({ commitsArray });
console.log(commitsArray.length);

const currentChangelog = fs.readFileSync('./CHANGELOG.md', 'utf-8');
// const currentVersion = Number(require('./package.json').version);
const currentVersion = require('./package.json').version;
// const newVersion = currentVersion + 1;
let newChangelog = `# Version ${currentVersion} (${
  new Date().toISOString().split('T')[0]
})\n\n`;


const tags = [];

const chores = [];
const enhances = [];
const features = [];
const fixes = [];
const lessons = [];
const perfs = [];
const refactors = [];
const sections = [];

// this is the processing order for the change log
tags.push(new Tag(features, 'feature: ', `## Features\n`));
tags.push(new Tag(enhances, 'enhancement: ', `## Enhancements\n`));
tags.push(new Tag(sections, 'section: ', `## Sections\n`));
tags.push(new Tag(lessons, 'lesson: ', `## Lessons\n`));
tags.push(new Tag(fixes, 'fix: ', `## Fixes\n`));
tags.push(new Tag(perfs, 'performance: ', `## Performance Tweaks\n`));
tags.push(new Tag(refactors, 'refactor: ', `## Refactorings\n`));
tags.push(new Tag(chores, 'chore: ', `## Chores\n`));

function processCommitString(commit, arr, str) {
  if (commit.message.startsWith(str)) {
    arr.push(
      `* ${commit.message.replace(str, '')} ([${commit.sha.substring(
        0,
        6
      )}](${gitRepo}/commit/${
        commit.sha
      }))\n`
    );
  }
}

function writeList(arr, str) {
  if (arr.length) {
    console.log(arr.length)
    newChangelog += str;
    arr.forEach(feature => {
      newChangelog += feature;
    });
    newChangelog += '\n';
  }
}

commitsArray.forEach(commit => {
  tags.forEach(tag => {
    processCommitString(commit, tag.aList, tag.tag);  
  });
});

tags.forEach(tag => {
  writeList(tag.aList, tag.description);
});

// prepend the newChangelog to the current one
fs.writeFileSync('./CHANGELOG.md', `${newChangelog}${currentChangelog}`);

