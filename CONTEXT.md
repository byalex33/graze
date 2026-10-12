# Graze

A calm, low-friction calorie and macro tracker for iPhone and Android that reads energy and weight from the phone's Health Store and never nags.

## Language

### Logging

**Entry**:
One thing eaten, recorded with its own copy of calories and macros taken at the moment it was logged; later changes to its Food never alter it.
_Avoid_: Log item, record, food log

**Day**:
A calendar day running from local midnight to midnight. An Entry belongs to the Day on which it was eaten, in the time zone where it was eaten.
_Avoid_: Date, diary day

**Logged Day**:
A Day with at least one Entry.
_Avoid_: Active day, streak day, tracked day

**Completed Day**:
A Day that has ended. Only Completed Days show a Net.
_Avoid_: Past day, closed day

**Food**:
A product or generic item from the food database (scanned or searched) that an Entry can be made from.
_Avoid_: Product, item, ingredient

**Serving**:
A named portion that a Food defines (e.g. "1 bar", "1 cup"). An Entry's amount is either a number of Servings or a weight/volume in grams or ml.
_Avoid_: Portion, unit

**Quick Add**:
An Entry made by typing calories (and optionally a name and macros) directly, with no Food behind it. A named Quick Add can be Favourited and re-logged like a Food.
_Avoid_: Manual entry, custom entry

**Recent**:
A Food or Quick Add the user logged lately, offered for one-tap re-logging.
_Avoid_: History

**Favourite**:
A Food or Quick Add the user has pinned for one-tap re-logging.
_Avoid_: Saved food, starred

### Energy

**Goal**:
The daily amount to eat, set by the user as calories plus protein. Burned never changes it.
_Avoid_: Budget, target, allowance, limit

**Eaten**:
Total calories from the Entries in a Day.
_Avoid_: Intake, consumed, calories in

**Burned**:
Active energy plus resting energy for a Day, as read from the Health Store. For today it is a running "so far" figure.
_Avoid_: Expenditure, exercise calories, calories out

**Net**:
Eaten minus Burned for a Completed Day. It is not shown when resting energy is missing.
_Avoid_: Balance, deficit (unless specifically negative)

**Macros**:
Protein, carbs and fat. Protein is first-class alongside calories; carbs and fat are secondary.

### Body

**Weigh-in**:
One body-weight measurement, either read from the Health Store or entered in the app (and then written to the Health Store).
_Avoid_: Weight log, weight entry

### Platform

**Health Store**:
The phone's shared health database: Apple Health (HealthKit) on iPhone, Health Connect on Android.
_Avoid_: Google Fit, Google Health, Health app

**Reminder**:
The single optional, user-scheduled notification. It is off by default and fires only if today is not yet a Logged Day.
_Avoid_: Notification, nudge, push
