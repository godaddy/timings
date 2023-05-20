module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 75],
    'body-max-line-length': [0, 'always', Infinity],
    'footer-max-length': [0, 'always', Infinity],
    'footer-max-line-length': [0, 'always', Infinity],
    'footer-leading-blank': [1, 'always']
  }
};
