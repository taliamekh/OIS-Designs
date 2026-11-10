# Connect the iPhone to the app

Updated November10,2026. Phone pairing and account login are deferred while the user sleeps; development continues independently. No physical iPhone launch has been verified.

You do not need to run a command or find a project folder yourself. Ask the app chat to start or check the preview and provide its current QR code.

1. Update Expo Go on the iPhone. This project uses SDK58; Expo Go must support the same SDK. If it asks you to sign in, use Expo's own screen and enter credentials yourself.
2. When ready, put the laptop and phone on a private Wi-Fi network or a reachable hotspot. Public Wi-Fi often isolates connected devices, so matching network names alone do not guarantee a connection.
3. Have the app chat check/start the existing preview. Scan its current QR using iPhone Camera, open Expo Go and allow iOS Local Network access if asked. The laptop must remain awake while serving this preview.
4. If it cannot connect, report the actual phone error. The app chat can prepare an Expo development tunnel if LAN access is blocked. No firewall/security changes or paid membership are needed for routine local troubleshooting.

The preview is a hidden independent Metro process on port8081. The app chat checks docs/build/metro-current.pid and verifies the matching process before reusing it. Its LAN URL was exp://10.10.5.96:8081 and the QR is [expo-qr.png](../build/expo-qr.png). A network change can invalidate that address; it must be rechecked before presenting it as current. Do not start a second competing server.

For a manual laptop launch later, Expo.cmd in the repository root starts the existing project. The app chat can run this for you. There is no need to reinstall the project or use a starter-reset command.

The phone need not remain open for code, model or automated browser work. Device gestures, native texture uploads, file sharing, OS restart/recovery and GPU/thermal behavior remain unverified until exercised on a real iPhone/Android. A JavaScript bundle export is not a phone test. Custom future scanning modules may require a signed development build; the manual editor uses the current Expo preview path.

Sources: [current Expo Go](https://expo.dev/go), [SDK upgrade/Go compatibility](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [Expo development server](https://docs.expo.dev/more/expo-cli/).
