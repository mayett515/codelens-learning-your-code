# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Testing

Vitest is configured in `vitest.config.ts` for Node-based unit tests under
`src/**/*.test.ts` and `src/**/*.test.tsx`.

On Windows PowerShell, prefer `npm.cmd` so execution policy does not block the
npm shim:

```powershell
npm.cmd test
npm.cmd run test:watch
npm.cmd run test:providers
```

Live provider smoke tests are opt-in so normal test runs do not spend tokens:

```powershell
$env:RUN_LIVE_AI_TESTS='1'
$env:OPENROUTER_API_KEY='<openrouter-key>'
$env:SILICONFLOW_API_KEY='<siliconflow-key>'
$env:GOOGLE_AI_STUDIO_API_KEY='<google-ai-studio-key>' # or GOOGLE_API_KEY
$env:OPENCODE_GO_API_KEY='<opencode-go-key>'
npm.cmd run test:providers:live
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
