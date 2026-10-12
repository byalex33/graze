import { ReminderSection } from '@/ui/reminder-section';
import { SettingsPage } from '@/ui/settings-kit';

export default function ReminderSettings() {
  return (
    <SettingsPage
      title="Daily reminder"
      intro="One notification a day, only if you haven't logged anything by then. Off unless you turn it on."
    >
      <ReminderSection />
    </SettingsPage>
  );
}
