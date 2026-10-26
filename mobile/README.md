# Cadence (iPhone and Android)

The native version of Cadence: daily Readiness, Execution and Activity scores, content production, training, and three Claude-powered advisors. Built with Expo SDK 58 and Expo Router.

## What it does

- **Today**: three score rings with a breakdown of what moved each one, up to three priorities, a focus timer that notifies you when a block ends, tasks and daily habits.
- **Studio**: weekly upload target, the production pipeline (Idea → Posted), shipped uploads, stream schedule, idea bank and a publish checklist.
- **Body**: last night's sleep, HRV, resting heart rate and steps from your wearable, recent workouts, today's planned session, check-in, hydration, desk breaks, and 7, 14 and 30-day trends.
- **Coach**: Chief of Staff, Creative Director and Performance Coach. Each gets a snapshot of your live data with your first question.
- **Reminders**: morning plan, hydration, desk breaks, and 30 minutes before each scheduled stream.

Everything is stored on the phone. Nothing is sent anywhere except the advisor questions, which go to Anthropic.

## How your Whoop or Garmin data gets in

Cadence doesn't talk to the devices directly. Whoop and Garmin Connect both write into the phone's health store, and Cadence reads from there:

| Phone | Health store | What to turn on |
| --- | --- | --- |
| iPhone | Apple Health | The Apple Health integration in the Whoop app, and Apple Health under Connected Apps in Garmin Connect |
| Android | Health Connect | The Health Connect integration in the Whoop app and in Garmin Connect |

Then open **Body → Connect Apple Health** (or Health Connect) in Cadence. It reads sleep, HRV, resting heart rate, steps and workouts for the last 14 days, refreshes whenever the app opens, and you can pull down to refresh.

How the scores use it:
- **Readiness** = sleep vs your target (40%), HRV vs your own 7-day average (30%), resting heart rate vs your 7-day average (15%), and your energy check-in (15%). HRV and resting heart rate count once there are 3 days of history.
- **Activity** = training (40%; a wearable workout of 10+ minutes counts automatically), steps (20%), hydration (25%) and desk breaks (15%).
- If two apps both record the same night's sleep, Cadence uses the one with more recorded sleep rather than adding them together.

Apple Health stores HRV as SDNN and Health Connect stores RMSSD, so the two platforms give different absolute numbers. That's fine because scoring compares you to your own average.

## Get it on your phone

The health libraries need native code, so Cadence can't run in Expo Go. You need a build made with EAS, Expo's cloud build service. You don't need a Mac.

1. Create a free account at expo.dev.
2. In this folder:
   ```bash
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest init          # links the project to your Expo account
   ```
3. **iPhone** (needs an Apple Developer account, $99/year):
   ```bash
   npx eas-cli@latest device:create                          # register your iPhone
   npx eas-cli@latest build --profile development --platform ios
   ```
   Install the build from the link EAS gives you, then run `npx expo start` and open the project from the Cadence app on your phone.

   To install it like a normal app instead, use TestFlight: `npx testflight` builds, signs and uploads it in one command.
4. **Android** (no paid account needed for your own phone):
   ```bash
   npx eas-cli@latest build --profile preview --platform android
   ```
   Open the link on your phone and install the APK.

If `com.buckbros.cadence` is taken when you register the app, change `ios.bundleIdentifier` and `android.package` in `app.json`.

## Advisors

Open **Settings → Advisors** and paste a Claude API key from console.anthropic.com. It's stored encrypted on the phone (`expo-secure-store`) and only sent to Anthropic.

- Model: `claude-opus-5-5` at low effort, which suits short chat answers. Change `MODEL` or `effort` in `src/lib/claude.ts`.
- Server-side fallback is on (`fallbacks: "default"`). If a safety check declines a question, Anthropic retries it on a fallback model in the same request.
- The key lives in the app, which is fine for your own phone. Before giving Cadence to other people, move the call behind your own server so the key never ships in the app.

## Development

```bash
npx expo start        # dev server (connect from the development build)
npx tsc --noEmit      # typecheck
npx expo lint         # lint
npx expo-doctor       # dependency and config checks
npx expo start --web  # quick UI preview in a browser (no health data or notifications)
```

Layout:

```
src/app/              screens (Expo Router): (tabs)/index, studio, body, coach; settings modal
src/components/       UI kit, score ring, charts
src/lib/scores.ts     Readiness / Execution / Activity scoring
src/lib/health.*.ts   Apple Health (ios), Health Connect (android), no-op fallback
src/lib/claude.ts     advisor calls
src/lib/store.ts      on-device storage (zustand + AsyncStorage)
```

## Not built yet

- Home-screen widgets for the three scores (needs a native widget extension).
- Live Bluetooth heart rate during a session.
- Sync between devices (needs a backend such as Supabase).
