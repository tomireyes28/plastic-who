module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs', moduleResolution: 'node', target: 'ES2022',
        jsx: 'react-jsx', esModuleInterop: true, strict: true,
      },
    }],
  },
};
