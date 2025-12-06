module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // Общие правила стиля кода
    'no-console': 'off', // Разрешаем console.log (используется в боте)
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-trailing-spaces': 'warn',
    'eol-last': ['warn', 'always'],
    'semi': ['error', 'always'],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'comma-dangle': ['warn', 'always-multiline'],
    'indent': ['warn', 2, { SwitchCase: 1 }],

    // Правила для async/await
    'no-async-promise-executor': 'error',
    'require-await': 'warn',

    // Правила для обработки ошибок
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // Правила для чистоты кода
    'no-var': 'warn',
    'prefer-const': 'warn',
    'prefer-arrow-callback': 'warn',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-vars': 'off', // В тестах могут быть неиспользуемые переменные
      },
    },
  ],
};

