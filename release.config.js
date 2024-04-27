const types = [
  { type: 'major', release: 'major', section: 'Major features' },
  { type: 'feat', release: 'minor', section: 'Features' },
  { type: 'feature', release: 'minor', section: 'Features' },
  { type: 'fix', release: 'patch', section: 'Bug Fixes' },
  { type: 'perf', release: 'patch', section: 'Performance Improvements' },
  { type: 'revert', release: 'patch', section: 'Reverts' },
  { type: 'refactor', release: 'patch', section: 'Code Refactoring' },
  { type: 'ci', release: 'patch', section: 'CI/CD' },
  { type: 'docs', release: 'patch', section: 'Documentation', hidden: true },
  { type: 'chore', release: 'patch', section: 'Miscellaneous Chores', hidden: true },
  { type: 'style', release: 'patch', section: 'Styles', hidden: true },
  { type: 'test', release: 'patch', section: 'Tests', hidden: true },
  { type: 'build', release: false, section: 'Build System', hidden: true }
];

export default {
  branches: ['main'],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: types.map(t => { return { type: t.type, release: t.release }; }),
      parserOpts: {
        noteKeywords: ['BREAKING', 'BREAKING CHANGE', 'BREAKING CHANGES']
      },
    }],
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: {
        types: types.map(t => { return { type: t.type, section: t.section, hidden: t.hidden === true }; })
      },
    }],
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git'
  ]
};

export { types };
