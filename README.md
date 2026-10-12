# Graze

A calorie tracker that leaves you alone.

<!-- screenshots -->

## Why this exists

I was paying £50 a year for a calorie app. For that I got a notification every evening asking if I'd "forgotten dinner", a weekly email about my "journey", and a 41-day streak that reset because I went to a wedding and didn't log the cake. Then the barcode scanner moved up a pricing tier.

All I ever did in it was type a number and check how much I had left. That shouldn't cost £50 a year, and it definitely shouldn't need to message me about it.

So I built Graze for me and a mate. It's free, there's no account, and it never sends you a notification unless you turn one on yourself.

## What it does

- Log food as a number ("520 kcal, 40 g protein"), with or without a name
- Re-log things in two taps. The + button shows your usual stuff for this time of day
- Star anything you have a lot and it's always one tap away
- Calories and protein against a daily goal you set. Carbs and fat are tracked too, without targets
- Swipe back through previous days and fix anything you forgot
- Export everything to CSV whenever you like

## What it won't do

- Send notifications you didn't ask for. There's one optional reminder, it's off by default, and it stays quiet if you've already logged something that day
- Streaks, badges, scores, or "great job!"
- Turn red when you go over. It says "250 over" and that's it
- Make you sign up for anything
- Send your data anywhere. It lives on your phone

## Install

### Android

1. Download `graze-x.y.z.apk` from the [latest release](../../releases/latest) on your phone
2. Open it. Android will ask you to allow installs from your browser; allow it
3. If Play Protect says it doesn't recognise the app, tap **More details → Install anyway**. It warns about anything that isn't from the Play Store

New versions install over the top. **Don't uninstall to update**: your data lives in the app and uninstalling deletes it. Export a CSV first if you're ever unsure.

### iPhone

There's no App Store version. You can build it onto your own phone with a Mac and a free Apple ID:

```bash
git clone https://github.com/byalex33/graze.git && cd graze
npm install
npx expo run:ios --device
```

You'll need Xcode, Developer Mode turned on on the phone, and your Apple ID added in Xcode → Settings → Accounts. Free signing runs out after 7 days; run the last command again to reinstall over the top. Your data stays.

## Roadmap

- [x] Quick Add, Recents, Favourites, daily goal, day history, CSV export
- [ ] Barcode scanning and food search (Open Food Facts and USDA, both free)
- [ ] Apple Health and Health Connect: calories burned, weight, and saving what you log
- [ ] Trends: weekly averages, weight trend, a year of logged days
- [ ] The one optional reminder

## Development

Built with [Expo](https://expo.dev) and SQLite. Everything runs on the device; there's no server.

```bash
npm install
npx expo start          # with the app already installed on your phone
npm test                # domain tests
npx tsc --noEmit && npx expo lint
```

The words used in the code and the UI are defined in [CONTEXT.md](CONTEXT.md).

Release APKs are built and signed with `scripts/release-apk.sh`. The signing key isn't in the repo.

## License

[MIT](LICENSE)
