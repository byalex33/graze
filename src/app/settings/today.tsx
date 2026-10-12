import { SettingsPage } from '@/ui/settings-kit';
import { TodayLayoutSection } from '@/ui/today-layout-section';

export default function TodaySettings() {
  return (
    <SettingsPage title="Today screen" intro="What shows under your calories. Your entries are always there.">
      <TodayLayoutSection />
    </SettingsPage>
  );
}
