const browserGlobals = {
  AudioContext: 'readonly',
  Blob: 'readonly',
  CustomEvent: 'readonly',
  document: 'readonly',
  Element: 'readonly',
  Event: 'readonly',
  fetch: 'readonly',
  HTMLElement: 'readonly',
  Image: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  performance: 'readonly',
  requestAnimationFrame: 'readonly',
  ResizeObserver: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  URL: 'readonly',
  window: 'readonly'
};

const nodeGlobals = {
  Buffer: 'readonly',
  console: 'readonly',
  process: 'readonly',
  structuredClone: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly'
};

export default [
  {
    files: ['src/wildkin*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...browserGlobals, console: 'readonly' }
    },
    rules: {
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-promise-executor-return': 'error',
      'no-prototype-builtins': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-with': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error'
    }
  },
  {
    files: ['tests/wildkin*.mjs', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals
    },
    rules: {
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-import-assign': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error'
    }
  }
];
