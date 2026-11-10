# Connect the iPhone to the app

Updated November10,2026. Phone pairing and account login are deferred while the user sleeps; development continues independently. No physical iPhone launch has been verified.

You do not need to run a command or find a project folder yourself. Ask the app chat to start or check the preview and provide its current QR code.

1. Update Expo Go on the iPhone. This project uses SDK58; Expo Go must support the same SDK. If it asks you to sign in, use Expo's own screen and enter credentials yourself.
2. A tunnel preview is now prepared: use the current QR below when ready. With this route the phone and laptop do not need to share a network. Public Wi-Fi can isolate LAN clients; private Wi-Fi or a reachable hotspot remains an alternative for a local preview.
3. Have the app chat check/start the existing preview. Scan its current QR using iPhone Camera, open Expo Go and allow iOS Local Network access if asked. The laptop must remain awake while serving this preview.
4. If it cannot connect, report the actual phone error. The app chat can prepare an Expo development tunnel if LAN access is blocked. No firewall/security changes or paid membership are needed for routine local troubleshooting.

Last verified November10 ~04:25UTC: **exp://unz98ga-anonymous-8081.exp.direct**, through Expo’s explicit anonymous ngrok provider. The public iPhone manifest and JavaScript endpoint both returnHTTP200. [Current QR](../build/expo-qr-tunnel.png). No physical phone launch has been observed. The app chat verifies the live endpoint/PID before reusing it; tunnel URLs are temporary. Do not start a second competing server.

The current task-managed Metro is PID10272/port8081/session90701. Expo58’s default signed tunnel asks for an Expo login; the prepared command uses `expo start --go --tunnel ngrok --port8081` with the CLI-required local development helper. This route required no login, signing account or paid project. The old LAN QR is historical.

For a manual laptop launch later, Expo.cmd in the repository root starts the existing project. The app chat can run this for you. There is no need to reinstall the project or use a starter-reset command.

The phone need not remain open for code, model or automated browser work. Device gestures, native texture uploads, file sharing, OS restart/recovery and GPU/thermal behavior remain unverified until exercised on a real iPhone/Android. A JavaScript bundle export is not a phone test. Custom future scanning modules may require a signed development build; the manual editor uses the current Expo preview path.

Sources: [current Expo Go](https://expo.dev/go), [SDK upgrade/Go compatibility](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [Expo development server](https://docs.expo.dev/more/expo-cli/).
