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

## Get it on your iPhone

The health libraries need native code, so Cadence can't run in Expo Go. It's built in the cloud by EAS (Expo's build service) and installed through TestFlight. You need a computer once, Mac or Windows, for the first build; it never needs Xcode.

**One-time setup**

1. **Join the Apple Developer Program** ($99/year). You can enroll from the Apple Developer app on the iPhone. Approval can take up to two days, so start here.
2. **Create a free Expo account** at expo.dev.
3. **Install the TestFlight app** on the iPhone from the App Store.
4. **On the computer**, install Node.js (the LTS version from nodejs.org), then get this repository onto it (GitHub's **Code → Download ZIP** on the default branch, or `git clone`).
5. Open a terminal in the `mobile` folder and run:
   ```bash
   npm install
   npx testflight
   ```
   It walks you through everything: it links the project to your Expo account, confirms the bundle ID, signs in to your Apple account (with two-factor), creates the signing certificates, builds the app in the cloud (about 15–20 minutes), and uploads it to TestFlight.
6. When Apple finishes processing the build (usually 10–30 minutes), it appears in the TestFlight app. Tap **Install**.

If `com.buckbros.cadence` is already taken, pick another bundle ID when `npx testflight` asks (for example `com.yourname.cadence`).

**Updates after that (no computer)**

`.eas/workflows/testflight.yml` builds and ships a new TestFlight version every time a change to `mobile/` lands on the repo's default branch (`claude/inspiring-keller-1cuy1c`, or `main` if you rename it). To turn it on:

1. On expo.dev, open the Cadence project → **Settings → GitHub**, install the Expo GitHub app and link this repository.
2. Set **Base directory** to `mobile`.

From then on, merging a change is all it takes; TestFlight on the phone shows the update. You can also start a run from the project's **Workflows** page.

**Connect the wearables (on the iPhone)**

1. In the Whoop app, turn on the Apple Health integration (in the app's integrations settings) and allow sleep, HRV, resting heart rate and workouts.
2. In Garmin Connect, add Apple Health under **Connected Apps** and allow the same data.
3. Open Cadence → **Body → Connect Apple Health** and turn on every category it asks for.

## Android

No paid account is needed to install on your own Android phone. In the `mobile` folder:

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android
```

Open the link it gives you on the phone and install the APK. If `com.buckbros.cadence` is taken, change `android.package` in `app.json`.

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
